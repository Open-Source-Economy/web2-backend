BEGIN;

-- Create the predefined_category ENUM type
CREATE TYPE predefined_category_type AS ENUM (
    -- Core Building Blocks
    'programming_language',      -- Python, Rust, Go, TypeScript
    'runtime',                   -- Node.js, JVM, .NET, Deno
    
    -- Application Layers
    'frontend',                  -- React, Vue, Angular, Svelte
    'backend',                   -- Django, Express, Spring Boot, Rails
    'mobile',                    -- React Native, Flutter, iOS, Android
    'desktop',                   -- Electron, Tauri, Qt, .NET MAUI
    'database',                  -- PostgreSQL, MongoDB, Redis, Elasticsearch
    
    -- Specialized Domains
    'machine_learning',          -- TensorFlow, PyTorch, scikit-learn
    'data_processing',           -- Pandas, Spark, Airflow, dbt
    'hardware',                  -- Raspberry Pi, Arduino, embedded systems
    
    -- Infrastructure & Operations
    'infrastructure',            -- Kubernetes, Docker, Terraform, CI/CD
    'monitoring_observability',  -- Prometheus, Grafana, Datadog, Sentry
    
    -- Communication & Integration
    'api_networking',            -- GraphQL, gRPC, REST frameworks, Protocol Buffers
    
    -- Development Ecosystem
    'build_tools',               -- Webpack, Maven, Gradle, Vite
    'testing',                   -- Jest, Pytest, Selenium, Cypress
    'documentation',             -- Sphinx, Docusaurus, Swagger
    
    -- Cross-cutting Concerns
    'security',                  -- OAuth, encryption, vulnerability tools
    'library'                    -- General utilities, helpers (catch-all)
);

-- Add category columns to developer_project_items table
-- custom_categories: user-defined custom categories (free text)
-- predefined_categories: categories selected from a predefined list
ALTER TABLE developer_project_items
ADD COLUMN custom_categories TEXT[],
ADD COLUMN predefined_categories predefined_category_type[];

-- Add categories to project_item table
-- This allows admins to categorize projects with predefined categories
ALTER TABLE project_item
    ADD COLUMN categories predefined_category_type[];

COMMIT;