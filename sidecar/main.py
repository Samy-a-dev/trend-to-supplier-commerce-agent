import asyncio
import os
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    import prometheux_chain as px
except Exception as exc:  # pragma: no cover - surfaced by /health and /derive
    px = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


app = FastAPI(title="Trend-to-Supplier Prometheux Sidecar")


class DeriveRequest(BaseModel):
    program: str
    output_predicates: list[str] = Field(default_factory=list)
    concept_name: str = "pipeline_rules"
    compute: str | None = None
    timeout_seconds: int = 60


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": IMPORT_ERROR is None,
        "prometheux_import_error": str(IMPORT_ERROR) if IMPORT_ERROR else None,
    }


@app.post("/derive")
async def derive(request: DeriveRequest) -> dict[str, Any]:
    if IMPORT_ERROR is not None or px is None:
        raise HTTPException(status_code=500, detail=f"prometheux-chain import failed: {IMPORT_ERROR}")

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_derive_sync, request),
            timeout=request.timeout_seconds,
        )
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Prometheux derivation timed out") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": type(exc).__name__,
                "message": str(exc),
            },
        ) from exc


def _derive_sync(request: DeriveRequest) -> dict[str, Any]:
    token = _required_env("PMTX_TOKEN")
    org = _required_env("PMTX_ORG")
    user = _required_env("PMTX_USER")
    os.environ["PMTX_TOKEN"] = token
    px.config.set(
        "JARVISPY_URL",
        os.getenv("JARVISPY_URL") or f"https://api.prometheux.ai/jarvispy/{org}/{user}",
    )
    compute = request.compute or os.getenv("PMTX_COMPUTE") or None

    project_name = f"sidecar_run_{uuid.uuid4().hex[:12]}"
    project_id = px.save_project(project_name=project_name)
    px.save_concept(
        project_id=project_id,
        definition=request.program,
        concept_name=request.concept_name,
        compute=compute,
    )

    raw: dict[str, Any] = {}
    normalized: dict[str, list[dict[str, Any]]] = {}
    for predicate in request.output_predicates:
        px.run_concept(
            project_id=project_id,
            concept_name=predicate,
            persist_outputs=True,
            compute=compute,
        )
        data = px.fetch_results(
            project_id=project_id,
            output_predicate=predicate,
            page_size=1000,
        )
        raw[predicate] = data
        normalized[predicate] = _normalize_rows(data)

    return {
        "project_id": project_id,
        "results": normalized,
        "raw": raw,
    }


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _normalize_rows(data: Any) -> list[dict[str, Any]]:
    if data is None:
        return []

    if isinstance(data, list):
        return [_row_to_dict(item) for item in data]

    if isinstance(data, dict):
        nested_results = data.get("results")
        if isinstance(nested_results, dict):
            facts = nested_results.get("facts")
            columns = nested_results.get("columnNames") or nested_results.get("column_names")
            if isinstance(facts, list):
                return [_row_to_dict(item, columns if isinstance(columns, list) else None) for item in facts]
        for key in ("rows", "results", "items", "data"):
            value = data.get(key)
            if isinstance(value, list):
                if isinstance(data.get("columns"), list):
                    return [_row_to_dict(item, data["columns"]) for item in value]
                return [_row_to_dict(item) for item in value]
        return [data]

    return [{"value": data}]


def _row_to_dict(row: Any, columns: list[str] | None = None) -> dict[str, Any]:
    if isinstance(row, dict):
        return row
    if isinstance(row, (list, tuple)):
        if columns:
            return {str(columns[index]): value for index, value in enumerate(row)}
        return {f"col_{index}": value for index, value in enumerate(row)}
    return {"value": row}
