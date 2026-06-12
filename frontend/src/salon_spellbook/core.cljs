(ns salon-spellbook.core
  (:require [reagent.dom :as rdom]
            [re-frame.core :as rf]
            [salon-spellbook.events]
            [salon-spellbook.subs]
            [salon-spellbook.particles :as particles]
            [salon-spellbook.views :as views]))

(defn ^:dev/after-load mount-root []
  (rf/clear-subscription-cache!)
  (rdom/render [views/app] (.getElementById js/document "app")))

(defn init []
  (rf/dispatch-sync [:initialize-db])
  (particles/mount!)
  (mount-root))
