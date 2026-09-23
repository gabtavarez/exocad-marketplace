# AGENTS.md
## Arquitetura Geral
- Este é um marketplace odontológico para serviços CAD/CAM.
- O frontend está em `/frontend` (React + Vite + Tailwind + Three.js).
- O backend está em `/backend` (Java 21 + Spring Boot 3.3 + PostgreSQL).
- NUNCA trafegue arquivos pesados (.stl, .ply) pelo backend Java. Use sempre URLs pré-assinadas (Presigned URLs) do S3/MinIO.

## Regras de Domínio Odontológico
- Os dentes devem SEMPRE seguir a numeração FDI (11 a 48).
- Status da Ordem de Serviço devem ser estritos: DRAFT, OPEN, IN_PROGRESS, REVIEW, COMPLETED.

## Acordos de Código
- Backend: Não use `@Data` do Lombok em Entidades JPA (causa loops infinitos), use apenas `@Getter` e `@Setter`.
- Frontend: Mantenha o estado do visualizador 3D isolado dos formulários.
- Sempre pergunte antes de instalar novas dependências (npm ou Maven).

## Padrão de Commits Git
- Siga estritamente o padrão Conventional Commits em português (todas as letras em minúsculas):
    - `feat: criar [nome do recurso/serviço] com [detalhe]`
    - `feat: adicionar [busca/filtro/endpoint] por [critério]`
    - `fix: alinhar [serviço] aos [dtos/contratos]`
    - `fix: corrigir [descrição do erro]`
    - `build: atualizar dependencias no pom.xml` (ou package.json)
    - `chore: configurar [ambiente/docker/migrations]`
- Mantenha mensagens atômicas, descritivas e sem ponto final.