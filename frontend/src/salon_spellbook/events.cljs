(ns salon-spellbook.events
  (:require [re-frame.core :as rf]
            [salon-spellbook.db :as db]))

(rf/reg-event-db :initialize-db
  (fn [_ _] db/default-db))

(rf/reg-event-db :set-login-field
  (fn [db [_ field value]]
    (assoc-in db [:login-form field] value)))

(rf/reg-event-db :login-success
  (fn [db [_ user]]
    (assoc db :current-user user :page :dashboard :error nil)))

(rf/reg-event-db :login-error
  (fn [db [_ msg]]
    (assoc db :error msg :loading? false)))

(rf/reg-event-db :set-loading
  (fn [db [_ v]] (assoc db :loading? v)))

(rf/reg-event-db :logout
  (fn [_ _] db/default-db))

(rf/reg-event-db :navigate
  (fn [db [_ page]] (assoc db :page page)))

;; Stub login — backend API hívással majd felváltjuk
(rf/reg-event-fx :submit-login
  (fn [{:keys [db]} _]
    (let [{:keys [email password]} (:login-form db)
          users {"felicia@salon-spellbook.local" {:name "Felicia" :email "felicia@salon-spellbook.local"}
                 "gitta@salon-spellbook.local"   {:name "Gitta"   :email "gitta@salon-spellbook.local"}
                 "lili@salon-spellbook.local"    {:name "Lili"    :email "lili@salon-spellbook.local"}}]
      (if (and (users email) (seq password))
        {:db (assoc db :loading? true)
         :dispatch-later [{:ms 800 :dispatch [:login-success (users email)]}]}
        {:dispatch [:login-error "Érvénytelen e-mail cím vagy jelszó."]}))))
