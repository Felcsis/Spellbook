(ns salon-spellbook.db)

(def stub-guests
  [{:id "g1" :name "Kovács Mária" :phone "+36 20 123 4567" :notes "Szőke, hosszú haj, érzékeny fejbőr"
    :cards [{:id "c1" :date "2026-06-10" :worker "Felicia" :total 15000
             :services [{:name "Hajvágás" :price 8000} {:name "Tőfestés" :price 7000}]
             :notes "Gyönyörű lett!"}
            {:id "c2" :date "2026-03-15" :worker "Gitta" :total 12000
             :services [{:name "Hajvágás" :price 8000} {:name "Balayage" :price 4000}]
             :notes nil}]}
   {:id "g2" :name "Nagy Eszter" :phone "+36 30 987 6543" :notes "Sötétbarna, göndör"
    :cards [{:id "c3" :date "2026-05-22" :worker "Lili" :total 9500
             :services [{:name "Hajvágás" :price 6000} {:name "Hajmaszk" :price 3500}]
             :notes nil}]}
   {:id "g3" :name "Tóth Réka" :phone "+36 70 555 1234" :notes nil
    :cards [{:id "c4" :date "2026-06-01" :worker "Felicia" :total 22000
             :services [{:name "Teljes festés" :price 18000} {:name "Hajvágás" :price 4000}]
             :notes "Platinaszőke"}
            {:id "c5" :date "2026-02-14" :worker "Felicia" :total 18000
             :services [{:name "Teljes festés" :price 18000}]
             :notes nil}
            {:id "c6" :date "2025-11-05" :worker "Gitta" :total 8000
             :services [{:name "Hajvágás" :price 8000}]
             :notes nil}]}
   {:id "g4" :name "Balogh Anna" :phone nil :notes "Rövid haj, modern stílus"
    :cards [{:id "c7" :date "2026-04-18" :worker "Lili" :total 7500
             :services [{:name "Hajvágás" :price 7500}]
             :notes nil}]}
   {:id "g5" :name "Fekete Zsuzsa" :phone "+36 20 444 8888" :notes "Allergiás ammóniára!"
    :cards []}])

(def default-db
  {:page            :login
   :loading?        false
   :error           nil
   :current-user    nil
   :login-form      {:email "" :password ""}
   :guests          stub-guests
   :guests-search   ""
   :selected-guest  nil
   :add-guest-modal false
   :add-guest-form  {:name "" :phone "" :notes ""}})
