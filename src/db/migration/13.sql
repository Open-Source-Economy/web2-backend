-- Service categories seed data migration (aligned with existing ServiceType enums)
-- Migration 13: Pre-populate service categories matching backend/src/api/model/project/ServiceType.ts

-- Insert service categories matching existing ServiceType enum structure
INSERT INTO service_category (name, parent_category, has_response_time) VALUES
-- Main service categories (matching ServiceType enum)
('Support', NULL, TRUE),
('Development', NULL, TRUE),
('Operation', NULL, TRUE),
('Advisory', NULL, FALSE),

-- Support subcategories (matching SupportSubServiceType)
('Bug Fixes', 'Support', TRUE),
('New Features', 'Support', TRUE),
('Code Maintenance', 'Support', TRUE),

-- Development subcategories (matching DevelopmentSubServiceType)
('Technical Assistance', 'Development', TRUE),
('Deployment Guidance', 'Development', TRUE),
('Customer Support', 'Development', TRUE),

-- Operation subcategories (matching OperationSubServiceType)
('Incident Response', 'Operation', TRUE),
('Proactive Monitoring', 'Operation', TRUE),
('24/7 Supervision', 'Operation', TRUE),

-- Advisory subcategories (matching AdvisorySubServiceType)
('Architecture Design', 'Advisory', FALSE),
('Technology Assessment', 'Advisory', FALSE),
('Security & Performance', 'Advisory', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (13) ON CONFLICT DO NOTHING;