(ns salon-spellbook.db)

(def default-db
  {:page       :login
   :loading?   false
   :error      nil
   :current-user nil
   :login-form {:email "" :password ""}})
