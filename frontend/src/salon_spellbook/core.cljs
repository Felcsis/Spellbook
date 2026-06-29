(ns salon-spellbook.core
  (:require [reagent.dom.client :as rdom]
            [re-frame.core :as rf]
            [salon-spellbook.events]
            [salon-spellbook.subs]
            [salon-spellbook.particles :as particles]
            [salon-spellbook.views :as views]))

(defonce root (atom nil))

(defn ^:dev/after-load mount-root []
  (rf/clear-subscription-cache!)
  (when @root
    (rdom/render @root [views/app])))

(defn init []
  (rf/dispatch-sync [:initialize-db])
  (particles/mount!)
  (reset! root (rdom/create-root (.getElementById js/document "app")))
  (rdom/render @root [views/app]))
