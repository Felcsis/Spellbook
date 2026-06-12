(ns salon-spellbook.core
  (:require [ring.adapter.jetty :as jetty]
            [salon-spellbook.router :as router]
            [salon-spellbook.db.core :as db]
            [taoensso.timbre :as log])
  (:gen-class))

(defn -main [& _args]
  (log/info "Starting Salon Spellbook backend...")
  (db/init!)
  (jetty/run-jetty (router/app) {:port 3000 :join? true}))
