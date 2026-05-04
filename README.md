# Projektdashboard

Monorepo fuer das Uni-Projekt an der FOM.

## Tech-Stack
- Frontend: React + Vite
- Backend: Spring Boot
- Build-Tool Backend: Gradle Wrapper
- Java-Version: 21

## Ordnerstruktur
```text
projektdashboard/
  README.md
  .gitignore
  backend/
  frontend/
  docs/
```

## Backend-Struktur
```text
backend/src/main/java/de/fom/projektdashboard/
  controller/
  service/
  model/
  dto/
  repository/
  config/
```

## Frontend-Zielstruktur
```text
frontend/src/
  components/
  pages/
  services/
  features/tickets/
  styles/
```

## Lokaler Start
### Backend
```powershell
cd backend
.\gradlew.bat bootRun
```

### Frontend
Wird spaeter mit React + Vite angelegt.

## Git-Workflow
- Default-Branch: `main`
- Keine direkten Pushes auf `main`
- Arbeit in Feature-Branches, z. B. `feature/repository-setup`
- Merge nur per Pull Request

