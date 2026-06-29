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
        (for [[icon title desc route] [["✂" "Időpontok"    "Foglalások kezelése"   :appointments]
                                       ["✦" "Szolgáltatások" "Kezelések és árak"   :services]
                                       ["♦" "Vendégek"     "Törzsvendég kártyák"   :clients]
                                       ["◈" "Statisztika"  "Bevételek és elemzés"  :stats]]]
          ^{:key title}
          [:div.card {:style {:cursor "pointer"}
                      :on-click #(rf/dispatch [:navigate route])}
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

;; ── Guests ────────────────────────────────────────────────────────────────────

(defn last-visit [guest]
  (some->> (:cards guest) seq (map :date) sort last))

(defn format-date [d]
  (when d
    (let [[y m day] (clojure.string/split d #"-")]
      (str day "." m "." y))))

(defn guest-card-row [card]
  [:div {:style {:border "1px solid var(--glass-border)" :border-radius "10px"
                 :padding "1rem 1.25rem" :margin-bottom "0.75rem"
                 :background "rgba(255,255,255,0.02)"}}
   [:div {:style {:display "flex" :justify-content "space-between" :align-items "center"
                  :margin-bottom "0.5rem"}}
    [:span {:style {:font-family "'Cinzel',serif" :font-size "0.7rem"
                    :color "var(--gold)" :letter-spacing "0.12em"}}
     (format-date (:date card))]
    [:span {:style {:font-size "0.85rem" :color "var(--rose)" :font-style "italic"}}
     (str (:worker card) " ✦")]]
   [:div {:style {:font-size "0.9rem" :color "rgba(245,230,211,0.7)" :margin-bottom "0.4rem"}}
    (clojure.string/join ", " (map :name (:services card)))]
   [:div {:style {:display "flex" :justify-content "space-between" :align-items "center"}}
    (when (:notes card)
      [:span {:style {:font-style "italic" :font-size "0.8rem" :color "rgba(245,230,211,0.4)"}}
       (:notes card)])
    [:span {:style {:font-family "'Cinzel',serif" :font-size "0.9rem" :color "var(--gold-light)"}}
     (str (int (:total card)) " Ft")]]])

(defn guest-detail-panel [guest]
  [:div {:style {:position "fixed" :top 0 :right 0 :bottom 0 :width "420px"
                 :background "rgba(10,6,20,0.97)" :border-left "1px solid var(--glass-border)"
                 :backdrop-filter "blur(24px)" :z-index 100
                 :display "flex" :flex-direction "column"
                 :animation "fadeIn 0.25s ease"}}
   [:div {:style {:padding "1.75rem 1.75rem 1rem" :border-bottom "1px solid var(--glass-border)"
                  :display "flex" :align-items "center" :gap "1rem"}}
    [:div.avatar {:style {:width "52px" :height "52px" :font-size "1.1rem"}}
     (initials (:name guest))]
    [:div {:style {:flex 1}}
     [:div {:style {:font-family "'Playfair Display',serif" :font-size "1.25rem"
                    :color "var(--gold-light)"}} (:name guest)]
     (when (:phone guest)
       [:div {:style {:font-size "0.85rem" :color "rgba(245,230,211,0.5)" :margin-top "0.2rem"}}
        (:phone guest)])]
    [:span {:style {:cursor "pointer" :font-size "1.3rem" :color "var(--gold-dim)"
                    :padding "0.25rem 0.5rem"}
            :on-click #(rf/dispatch [:close-guest])} "✕"]]

   (when (:notes guest)
     [:div {:style {:padding "0.75rem 1.75rem"
                    :background "rgba(201,168,76,0.05)" :border-bottom "1px solid var(--glass-border)"}}
      [:span {:style {:font-style "italic" :font-size "0.9rem" :color "var(--rose)" :opacity "0.8"}}
       (:notes guest)]])

   [:div {:style {:padding "1rem 1.75rem 0.5rem"}}
    [:div {:style {:font-family "'Cinzel',serif" :font-size "0.65rem" :letter-spacing "0.2em"
                   :color "var(--gold-dim)" :text-transform "uppercase"}}
     (str (count (:cards guest)) " látogatás")]]

   [:div {:style {:flex 1 :overflow-y "auto" :padding "0 1.75rem 1.75rem"}}
    (if (empty? (:cards guest))
      [:div {:style {:text-align "center" :color "rgba(245,230,211,0.3)"
                     :font-style "italic" :padding "2rem 0"}}
       "Még nincs látogatás rögzítve ✦"]
      (for [card (reverse (sort-by :date (:cards guest)))]
        ^{:key (:id card)} [guest-card-row card]))]])

(defn add-guest-modal []
  (let [form (rf/subscribe [:add-guest-form])]
    (fn []
      [:div {:style {:position "fixed" :inset 0 :z-index 200
                     :background "rgba(7,4,15,0.85)" :backdrop-filter "blur(8px)"
                     :display "flex" :align-items "center" :justify-content "center"
                     :animation "fadeIn 0.2s ease"}}
       [:div.login-card {:style {:max-width "480px" :width "100%" :animation "fadeInUp 0.3s ease"}}
        [:div {:style {:display "flex" :justify-content "space-between" :align-items "center"
                       :margin-bottom "1.75rem"}}
         [:h2 {:style {:font-family "'Cinzel',serif" :color "var(--gold-light)"
                       :font-size "1.1rem" :letter-spacing "0.12em"}} "Új vendég hozzáadása"]
         [:span {:style {:cursor "pointer" :color "var(--gold-dim)" :font-size "1.2rem"}
                 :on-click #(rf/dispatch [:close-add-guest-modal])} "✕"]]

        [:div.form-group
         [:label.form-label "Név *"]
         [:input.form-input
          {:type "text" :placeholder "Teljes név"
           :value (:name @form)
           :on-change #(rf/dispatch [:set-add-guest-field :name (.. % -target -value)])}]]

        [:div.form-group
         [:label.form-label "Telefonszám"]
         [:input.form-input
          {:type "tel" :placeholder "+36 20 ..."
           :value (:phone @form)
           :on-change #(rf/dispatch [:set-add-guest-field :phone (.. % -target -value)])}]]

        [:div.form-group
         [:label.form-label "Megjegyzés"]
         [:textarea.form-input
          {:placeholder "Hajszín, allergénia, preferenciák..."
           :rows 3 :style {:resize "vertical" :font-family "'Cormorant Garamond',serif"}
           :value (:notes @form)
           :on-change #(rf/dispatch [:set-add-guest-field :notes (.. % -target -value)])}]]

        [:button.btn-magic
         {:on-click #(when (seq (:name @form))
                       (rf/dispatch [:submit-add-guest]))
          :disabled (not (seq (:name @form)))}
         "Vendég mentése ✦"]]])))

(defn guests-page []
  (let [guests   (rf/subscribe [:guests-filtered])
        search   (rf/subscribe [:guests-search])
        selected (rf/subscribe [:selected-guest])
        modal?   (rf/subscribe [:add-guest-modal])]
    (fn []
      [:div.main-content
       [:h1.page-title "Vendégek ✦"]
       [:p.page-subtitle "Törzsvendégek és látogatási előzmények"]

       [:div {:style {:display "flex" :gap "1rem" :margin-bottom "2rem" :align-items "center"}}
        [:input.form-input
         {:type "text" :placeholder "Keresés név szerint..."
          :value @search
          :style {:flex 1 :max-width "360px"}
          :on-change #(rf/dispatch [:set-guest-search (.. % -target -value)])}]
        [:button.btn-magic
         {:style {:width "auto" :padding "0.85rem 1.5rem" :flex-shrink 0}
          :on-click #(rf/dispatch [:open-add-guest-modal])}
         "+ Új vendég"]]

       (if (empty? @guests)
         [:div {:style {:text-align "center" :color "rgba(245,230,211,0.3)"
                        :font-style "italic" :padding "4rem 0"}}
          "Nincs találat ✦"]
         [:div {:style {:display "grid"
                        :grid-template-columns "repeat(auto-fill, minmax(280px,1fr))"
                        :gap "1rem"}}
          (for [g @guests]
            ^{:key (:id g)}
            [:div.card {:style {:cursor "pointer"}
                        :on-click #(rf/dispatch [:select-guest g])}
             [:div {:style {:display "flex" :align-items "center" :gap "1rem" :margin-bottom "1rem"}}
              [:div.avatar (initials (:name g))]
              [:div
               [:div {:style {:font-family "'Cinzel',serif" :font-size "0.85rem"
                               :color "var(--gold-light)" :letter-spacing "0.08em"}} (:name g)]
               (when (:phone g)
                 [:div {:style {:font-size "0.8rem" :color "rgba(245,230,211,0.4)"
                                :margin-top "0.2rem"}} (:phone g)])]]
             [:div {:style {:display "flex" :justify-content "space-between"
                            :font-size "0.8rem" :color "rgba(245,230,211,0.5)"}}
              [:span (str (count (:cards g)) " látogatás")]
              (when-let [lv (last-visit g)]
                [:span {:style {:color "var(--rose)" :font-style "italic"}}
                 (format-date lv)])]])])

       (when @selected
         [guest-detail-panel @selected])

       (when @modal?
         [add-guest-modal])])))

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
            :dashboard   [dashboard-page]
            :clients     [guests-page]
            [:div.main-content
             [:h1.page-title "Hamarosan..."]
             [:p.page-subtitle "Ez az oldal még készül ✦"]])])])))
