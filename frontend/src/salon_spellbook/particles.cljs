(ns salon-spellbook.particles
  (:require [reagent.core :as r]))

(defn random-between [a b] (+ a (* (js/Math.random) (- b a))))

(defn create-star []
  (let [el (js/document.createElement "div")]
    (set! (.-className el) "star")
    (set! (.. el -style -left)              (str (random-between 0 100) "vw"))
    (set! (.. el -style -top)               (str (random-between 0 100) "vh"))
    (set! (.. el -style -animationDuration) (str (random-between 2 6) "s"))
    (set! (.. el -style -animationDelay)    (str (random-between 0 6) "s"))
    (let [size (random-between 1 3)]
      (set! (.. el -style -width)  (str size "px"))
      (set! (.. el -style -height) (str size "px")))
    el))

(defn create-particle []
  (let [el    (js/document.createElement "div")
        size  (random-between 3 8)
        hue   (rand-nth ["rgba(201,168,76" "rgba(167,139,250" "rgba(232,180,200"])]
    (set! (.-className el) "particle")
    (set! (.. el -style -left)              (str (random-between 0 100) "vw"))
    (set! (.. el -style -bottom)            "-10px")
    (set! (.. el -style -width)             (str size "px"))
    (set! (.. el -style -height)            (str size "px"))
    (set! (.. el -style -background)        (str hue ",0.7)"))
    (set! (.. el -style -animationDuration) (str (random-between 8 18) "s"))
    (set! (.. el -style -animationDelay)    (str (random-between 0 10) "s"))
    el))

(defn mount! []
  (when-let [container (js/document.getElementById "particles")]
    (dotimes [_ 60] (.appendChild container (create-star)))
    (dotimes [_ 20] (.appendChild container (create-particle)))))
