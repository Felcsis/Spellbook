(ns salon-spellbook.subs
  (:require [re-frame.core :as rf]
            [clojure.string :as str]))

(rf/reg-sub :page          (fn [db _] (:page db)))
(rf/reg-sub :loading?      (fn [db _] (:loading? db)))
(rf/reg-sub :error         (fn [db _] (:error db)))
(rf/reg-sub :current-user  (fn [db _] (:current-user db)))
(rf/reg-sub :login-form    (fn [db _] (:login-form db)))

(rf/reg-sub :guests-search   (fn [db _] (:guests-search db)))
(rf/reg-sub :selected-guest  (fn [db _] (:selected-guest db)))
(rf/reg-sub :add-guest-modal (fn [db _] (:add-guest-modal db)))
(rf/reg-sub :add-guest-form  (fn [db _] (:add-guest-form db)))

(rf/reg-sub :guests-filtered
  (fn [db _]
    (let [q     (str/lower-case (or (:guests-search db) ""))
          guests (:guests db)]
      (if (str/blank? q)
        guests
        (filter #(str/includes? (str/lower-case (:name %)) q) guests)))))
