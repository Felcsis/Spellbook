(ns salon-spellbook.router
  (:require [reitit.ring :as ring]
            [muuntaja.middleware :as muuntaja]))

(defn app []
  (ring/ring-handler
   (ring/router
    [["/api"
      ["/health" {:get (fn [_] {:status 200 :body {:status "ok"}})}]]]
    {:data {:muuntaja muuntaja/instance
            :middleware [muuntaja/format-middleware]}})
   (ring/create-default-handler)))
