import json
from pathlib import Path

from src.models.project import Project, ProjectSummary


class JsonProjectStore:
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _project_path(self, project_id: str) -> Path:
        return self.data_dir / f"{project_id}.json"

    def save(self, project: Project) -> None:
        path = self._project_path(project.id)
        path.write_text(project.model_dump_json(indent=2))

    def load(self, project_id: str) -> Project | None:
        path = self._project_path(project_id)
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return Project.model_validate(data)

    def list_all(self) -> list[ProjectSummary]:
        summaries = []
        for path in self.data_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
                project = Project.model_validate(data)
                summaries.append(
                    ProjectSummary(
                        id=project.id,
                        name=project.name,
                        created_at=project.created_at,
                        updated_at=project.updated_at,
                        style=project.design_context.style.value,
                        room_count=len(project.rooms),
                        has_results=len(project.results) > 0,
                    )
                )
            except (json.JSONDecodeError, ValueError):
                continue
        return sorted(summaries, key=lambda s: s.updated_at, reverse=True)

    def delete(self, project_id: str) -> bool:
        path = self._project_path(project_id)
        if path.exists():
            path.unlink()
            return True
        return False
