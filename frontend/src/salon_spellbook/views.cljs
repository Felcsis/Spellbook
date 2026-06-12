(ns salon-spellbook.views
  (:require [re-frame.core :as rf]
            [salon-spellbook.subs]))

;; ── Helpers ──────────────────────────────────────────────────────────────────

(defn initials [name]
  (some->> (clojure.string/split name #" ")
           (map first)
           (take 2)
           (apply str)))

;; ── Login ─────────────────────────────────────────────────────────────────────

(defn login-page []
  (let [form     (rf/subscribe [:login-form])
        loading? (rf/subscribe [:loading?])
        error    (rf/subscribe [:error])]
    (fn []
      [:div.login-page
       [:div.login-card
        [:div.login-logo
         [:div.login-sigil]
         [:h1.login-title "Salon Spellbook"]
         [:p.login-subtitle "Varázslatos szépség, minden napra"]]

        [:div.form-group
         [:label.form-label {:for "email"} "E-mail cím"]
         [:input.form-input
          {:id          "email"
           :type        "email"
           :placeholder "varazslo@szalon.hu"
           :value       (:email @form)
           :on-change   #(rf/dispatch [:set-login-field :email (.. % -target -value)])}]]

        [:div.form-group
         [:label.form-label {:for "password"} "Jelszó"]
         [:input.form-input
          {:id          "password"
           :type        "password"
           :placeholder "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦"
           :value       (:password @form)
           :on-change   #(rf/dispatch [:set-login-field :password (.. % -target -value)])
           :on-key-down #(when (= (.-key %) "Enter")
                           (rf/dispatch [:submit-login]))}]]

        [:button.btn-magic
         {:on-click #(rf/dispatch [:submit-login])
          :disabled @loading?}
         (if @loading? "Belépés..." "Belépés ✦")]

        (when @error
          [:div.form-error @error])]])))

;; ── Dashboard ─────────────────────────────────────────────────────────────────

(defn dashboard-page []
  (let [user (rf/subscribe [:current-user])]
    (fn []
      [:div.main-content
       [:h1.page-title (str "Üdvözöllek, " (:name @user) " ✦")]
       [:p.page-subtitle "Mi legyen a mai varázslat?"]
       [:div {:style {:display "grid" :grid-template-columns "repeat(auto-fill, minmax(220px,1fr))" :gap "1.25rem"}}
        (for [[icon title desc] [["✂" "Időpontok" "Foglalások kezelése"]
                                 ["✦" "Szolgáltatások" "Kezelések és árak"]
                                 ["♦" "Vendégek" "Törzsvendég kártyák"]
                                 ["◈" "Statisztika" "Bevételek és elemzés"]]]
          ^{:key title}
          [:div.card {:style {:cursor "pointer"}
                      :on-click #(rf/dispatch [:navigate (keyword (clojure.string/lower-case title))])}
           [:div {:style {:font-size "2rem" :margin-bottom "0.75rem" :color "var(--gold)"}} icon]
           [:div {:style {:font-family "'Cinzel',serif" :font-size "0.8rem" :letter-spacing "0.15em"
                          :color "var(--gold-light)" :margin-bottom "0.4rem"}} title]
           [:div {:style {:font-style "italic" :font-size "0.9rem" :color "rgba(245,230,211,0.5)"}} desc]])]])))

;; ── Sidebar ───────────────────────────────────────────────────────────────────

(defn sidebar []
  (let [user (rf/subscribe [:current-user])
        page (rf/subscribe [:page])]
    (fn []
      [:nav.sidebar
       [:div.sidebar-logo "✦ Salon Spellbook"]
       (for [[pg icon label] [[:dashboard "◈" "Főoldal"]
                               [:appointments "✦" "Időpontok"]
                               [:services "✂" "Szolgáltatások"]
                               [:clients "♦" "Vendégek"]]]
         ^{:key pg}
         [:div.nav-item {:class    (when (= @page pg) "active")
                         :on-click #(rf/dispatch [:navigate pg])}
          [:span {:style {:font-size "1.1rem"}} icon]
          label])
       [:div {:style {:flex 1}}]
       [:div {:style {:display "flex" :align-items "center" :gap "0.75rem"
                      :padding "0.75rem 1rem" :border-top "1px solid var(--glass-border)"
                      :margin-top "1rem"}}
        [:div.avatar (initials (:name @user "?"))]
        [:div
         [:div {:style {:font-size "0.9rem" :color "var(--cream)"}} (:name @user)]
         [:div {:style {:font-size "0.75rem" :color "var(--gold-dim)" :cursor "pointer"}
                :on-click #(rf/dispatch [:logout])} "Kilépés"]]]])))

;; ── Root ──────────────────────────────────────────────────────────────────────

(defn app []
  (let [page (rf/subscribe [:page])]
    (fn []
      [:<>
       [:div.bg-orb.bg-orb-1]
       [:div.bg-orb.bg-orb-2]
       [:div.bg-orb.bg-orb-3]
       (case @page
         :login    [:div#app-inner [login-page]]
         [:div.app-layout
          [sidebar]
          (case @page
            :dashboard [dashboard-page]
            [:div.main-content
             [:h1.page-title "Hamarosan..."]
             [:p.page-subtitle "Ez az oldal még készül ✦"]])])])))
