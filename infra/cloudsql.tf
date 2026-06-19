variable "db_password" {
  type        = string
  description = "Cloud SQL database password"
  sensitive   = true
}

resource "google_sql_database_instance" "postgres" {
  name             = "ecommerce-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  deletion_protection = false

  settings {
    tier              = "db-g1-small"
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 20
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      binary_log_enabled = false

      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  depends_on = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "product_db" {
  name     = "product_service"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "google_sql_database" "order_db" {
  name     = "order_service"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "google_sql_user" "app_user" {
  name     = "app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
  project  = var.project_id
}

output "db_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}
