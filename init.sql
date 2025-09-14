-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a database user for the application
CREATE USER synapse_user WITH PASSWORD 'synapse_password';
GRANT ALL PRIVILEGES ON DATABASE synapse_ai TO synapse_user;
