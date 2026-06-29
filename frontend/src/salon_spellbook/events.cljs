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

;; ── Guests ───────────────────────────────────────────────────────────────────

(rf/reg-event-db :set-guest-search
  (fn [db [_ q]] (assoc db :guests-search q)))

(rf/reg-event-db :select-guest
  (fn [db [_ guest]] (assoc db :selected-guest guest)))

(rf/reg-event-db :close-guest
  (fn [db _] (assoc db :selected-guest nil)))

(rf/reg-event-db :open-add-guest-modal
  (fn [db _] (assoc db :add-guest-modal true :add-guest-form {:name "" :phone "" :notes ""})))

(rf/reg-event-db :close-add-guest-modal
  (fn [db _] (assoc db :add-guest-modal false)))

(rf/reg-event-db :set-add-guest-field
  (fn [db [_ field value]] (assoc-in db [:add-guest-form field] value)))

(rf/reg-event-db :submit-add-guest
  (fn [db _]
    (let [{:keys [name phone notes]} (:add-guest-form db)
          new-guest {:id    (str "g" (inc (count (:guests db))))
                     :name  name
                     :phone (when (seq phone) phone)
                     :notes (when (seq notes) notes)
                     :cards []}]
      (-> db
          (update :guests conj new-guest)
          (assoc :add-guest-modal false)))))

;; ── Stub login — backend API hívással majd felváltjuk ─────────────────────
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
