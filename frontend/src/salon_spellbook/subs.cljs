(ns salon-spellbook.subs
  (:require [re-frame.core :as rf]))

(rf/reg-sub :page          (fn [db _] (:page db)))
(rf/reg-sub :loading?      (fn [db _] (:loading? db)))
(rf/reg-sub :error         (fn [db _] (:error db)))
(rf/reg-sub :current-user  (fn [db _] (:current-user db)))
(rf/reg-sub :login-form    (fn [db _] (:login-form db)))
