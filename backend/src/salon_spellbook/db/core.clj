(ns salon-spellbook.db.core
  (:require [next.jdbc :as jdbc]
            [next.jdbc.connection :as connection]
            [taoensso.timbre :as log])
  (:import (com.zaxxer.hikari HikariDataSource)))

(def ^:private db-spec
  {:dbtype   "postgresql"
   :dbname   (or (System/getenv "DB_NAME") "salon_spellbook")
   :host     (or (System/getenv "DB_HOST") "localhost")
   :port     (or (System/getenv "DB_PORT") "5432")
   :username (or (System/getenv "DB_USER") (System/getProperty "user.name"))
   :password (or (System/getenv "DB_PASSWORD") "")})

(defonce ^HikariDataSource datasource (atom nil))

(defn ds [] @datasource)

(defn init! []
  (log/info "Connecting to database...")
  (reset! datasource
          (connection/->pool HikariDataSource db-spec))
  (log/info "Database connected."))
