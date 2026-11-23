// The sector KPI library (brief §6.4): the measures the Analyst puts a threat in, so that a carrier's issue
// lands in cost per container and a utility's in customer churn. Identical in the three challengers and the
// Prototype Ideator; whoever changes it changes it in all four. It holds definitions only, never benchmark
// values. A source is the address of a standard definition, read on the date DATA_SOURCES.md gives, or
// "common practice" where the measure is defined the same way across the sector and no one body owns it.
// A KPI is { id: "<sector>.<name>", sector, name: { en, de }, unit, better: "higher" | "lower",
// definition: { en, de }, source }. tests/kpis.mjs holds the library to these rules.

export const COMMON_PRACTICE = "common practice";

const SRC = {
  nps: "https://nps.bain.com/about/measuring-your-net-promoter-score/",
  ghg: "https://ghgprotocol.org/corporate-standard",
  iso14083: "https://www.iso.org/standard/78864.html",
  ieee1366: "https://standards.ieee.org/ieee/1366/7243",
  cet1: "https://www.bis.org/committees/bcbs/basel-framework/standard/rbc?allChapters=true",
  lcr: "https://www.bis.org/publ/bcbs238.htm",
  solvency: "https://www.eiopa.europa.eu/rulebook/solvency-ii/article-2187_en",
};

/** The sectors, with their names; "general" holds the measures any company has. */
export const SECTORS = Object.freeze([
  { id: "telecom", name: { en: "Telecommunications", de: "Telekommunikation" } },
  { id: "transport_logistics", name: { en: "Transport and logistics", de: "Transport und Logistik" } },
  { id: "automotive_mobility", name: { en: "Automotive and mobility", de: "Automobil und Mobilität" } },
  { id: "industrial_manufacturing", name: { en: "Industrial manufacturing", de: "Industrielle Fertigung" } },
  { id: "energy_utilities", name: { en: "Energy and utilities", de: "Energie und Versorgung" } },
  { id: "retail_consumer", name: { en: "Retail and consumer goods", de: "Handel und Konsumgüter" } },
  { id: "banking", name: { en: "Banking", de: "Banken" } },
  { id: "insurance", name: { en: "Insurance", de: "Versicherungen" } },
  { id: "health_life_sciences", name: { en: "Health and life sciences", de: "Gesundheit und Life Sciences" } },
  { id: "public_sector", name: { en: "Public sector", de: "Öffentlicher Sektor" } },
  { id: "software_digital", name: { en: "Software and digital", de: "Software und Digitales" } },
  { id: "chemicals_materials", name: { en: "Chemicals and materials", de: "Chemie und Werkstoffe" } },
  { id: "general", name: { en: "Any company", de: "Jedes Unternehmen" } },
]);

// [name, en, de, unit, better, definition en, definition de, source]
const ROWS = {
  general: [
    ["revenue", "Revenue", "Umsatz", "EUR a year", "higher", "Income from selling goods and services in a year, before costs.", "Erlöse aus dem Verkauf von Waren und Leistungen in einem Jahr, vor Kosten."],
    ["ebit_margin", "EBIT margin", "EBIT-Marge", "% of revenue", "higher", "Earnings before interest and taxes as a share of revenue.", "Ergebnis vor Zinsen und Steuern als Anteil am Umsatz."],
    ["gross_margin", "Gross margin", "Bruttomarge", "% of revenue", "higher", "Revenue minus the direct cost of what was sold, as a share of revenue.", "Umsatz abzüglich der direkten Kosten des Verkauften, als Anteil am Umsatz."],
    ["free_cash_flow", "Free cash flow", "Freier Cashflow", "EUR a year", "higher", "Cash from operations minus capital spending in a year.", "Mittelzufluss aus dem laufenden Geschäft abzüglich der Investitionen in einem Jahr."],
    ["customer_churn", "Customer churn", "Kundenabwanderung", "% of customers a year", "lower", "The share of customers at the start of a year who leave during it.", "Anteil der Kunden zu Jahresbeginn, die im Lauf des Jahres gehen."],
    ["net_promoter_score", "Net Promoter Score", "Net Promoter Score", "points from −100 to 100", "higher", "The share of customers who would recommend the company, scoring 9 or 10 of 10, minus the share scoring 0 to 6.", "Anteil der Kunden, die das Unternehmen mit 9 oder 10 von 10 empfehlen würden, minus Anteil derer mit 0 bis 6.", SRC.nps],
    ["customer_acquisition_cost", "Customer acquisition cost", "Kundengewinnungskosten", "EUR per new customer", "lower", "Sales and marketing spending in a period divided by the new customers won in it.", "Vertriebs- und Marketingausgaben eines Zeitraums geteilt durch die darin gewonnenen Neukunden."],
    ["customer_lifetime_value", "Customer lifetime value", "Kundenwert über die Lebensdauer", "EUR per customer", "higher", "The gross margin a customer brings over the whole time they stay.", "Die Bruttomarge, die ein Kunde über die gesamte Dauer der Kundenbeziehung bringt."],
    ["staff_turnover", "Staff turnover", "Personalfluktuation", "% of staff a year", "lower", "The share of employees who leave in a year, against the average headcount.", "Anteil der Beschäftigten, die in einem Jahr gehen, bezogen auf den durchschnittlichen Personalbestand."],
    ["co2_per_unit", "CO2 per unit of output", "CO2 je Leistungseinheit", "t CO2e per unit of output", "lower", "Greenhouse gas emissions of scopes 1 and 2 in CO2 equivalents, divided by the units the company produces or delivers.", "Treibhausgasemissionen der Scopes 1 und 2 in CO2-Äquivalenten, geteilt durch die erzeugten oder erbrachten Einheiten.", SRC.ghg],
  ],
  transport_logistics: [
    ["cost_per_teu", "Cost per container moved", "Kosten je bewegtem Container", "EUR per TEU", "lower", "Operating cost of the services divided by the containers they carried, counted in twenty-foot equivalent units (TEU).", "Betriebskosten der Dienste geteilt durch die beförderten Container, gezählt in Standardcontainern (TEU)."],
    ["average_freight_rate", "Average freight rate", "Durchschnittliche Frachtrate", "EUR per TEU", "higher", "Freight revenue divided by the containers carried.", "Frachterlöse geteilt durch die beförderten Container."],
    ["schedule_reliability", "Schedule reliability", "Fahrplantreue", "% of vessel arrivals", "higher", "The share of vessel arrivals within one day of the published schedule.", "Anteil der Schiffsankünfte innerhalb eines Tages um den veröffentlichten Fahrplan."],
    ["vessel_utilisation", "Vessel utilisation", "Schiffsauslastung", "% of slots", "higher", "Containers carried as a share of the slots a service offers.", "Beförderte Container als Anteil der Stellplätze, die ein Dienst anbietet."],
    ["fuel_cost_per_teu", "Fuel cost per container", "Treibstoffkosten je Container", "EUR per TEU", "lower", "Bunker fuel cost of the services divided by the containers they carried.", "Bunkerkosten der Dienste geteilt durch die beförderten Container."],
    ["co2_per_teu_km", "CO2 per container-kilometre", "CO2 je Container-Kilometer", "g CO2e per TEU-km", "lower", "Greenhouse gas emissions of the transport chain in CO2 equivalents, divided by containers times kilometres, as ISO 14083 sets out.", "Treibhausgasemissionen der Transportkette in CO2-Äquivalenten, geteilt durch Container mal Kilometer, wie ISO 14083 es festlegt.", SRC.iso14083],
    ["empty_repositioning_cost", "Cost of moving empty containers", "Kosten der Leercontainer-Rückführung", "EUR per loaded TEU", "lower", "The cost of moving empty containers to where cargo waits, divided by the loaded containers carried.", "Kosten, leere Container dorthin zu bringen, wo Ladung wartet, geteilt durch die beladenen beförderten Container."],
    ["port_time_per_call", "Port time per call", "Liegezeit je Anlauf", "hours per call", "lower", "Average hours a vessel spends in port, from arrival to departure.", "Durchschnittliche Stunden eines Schiffs im Hafen, von der Ankunft bis zur Abfahrt."],
    ["emission_allowance_cost", "Emission allowance cost", "Kosten der Emissionszertifikate", "EUR per TEU", "lower", "The cost of the EU emission allowances the voyages need, divided by the containers carried.", "Kosten der EU-Emissionszertifikate, die die Reisen benötigen, geteilt durch die beförderten Container."],
  ],
  industrial_manufacturing: [
    ["order_intake", "Order intake", "Auftragseingang", "EUR a year", "higher", "The value of new orders received in a year.", "Wert der in einem Jahr eingegangenen Aufträge."],
    ["book_to_bill", "Book-to-bill ratio", "Book-to-Bill-Verhältnis", "ratio", "higher", "Order intake divided by the revenue billed in the same period; above 1 the order book grows.", "Auftragseingang geteilt durch den im selben Zeitraum abgerechneten Umsatz; über 1 wächst der Auftragsbestand."],
    ["service_revenue_share", "Share of service revenue", "Serviceanteil am Umsatz", "% of revenue", "higher", "Revenue from service, spare parts and maintenance as a share of total revenue.", "Umsatz aus Service, Ersatzteilen und Wartung als Anteil am Gesamtumsatz."],
    ["recurring_revenue_share", "Share of recurring revenue", "Anteil wiederkehrender Umsätze", "% of revenue", "higher", "Revenue under contracts that bill again each period, such as operating hours or subscriptions, as a share of total revenue.", "Umsatz aus Verträgen, die jede Periode neu abrechnen, etwa Betriebsstunden oder Abonnements, als Anteil am Gesamtumsatz."],
    ["on_time_delivery", "On-time delivery", "Liefertreue", "% of orders", "higher", "The share of orders delivered complete on the date promised.", "Anteil der Aufträge, die vollständig zum zugesagten Termin geliefert werden."],
    ["connected_base_share", "Share of the installed base that is connected", "Vernetzter Anteil der installierten Basis", "% of installed units", "higher", "Machines in the field that send operating data, as a share of all installed machines.", "Maschinen im Feld, die Betriebsdaten senden, als Anteil aller installierten Maschinen."],
    ["warranty_cost", "Warranty cost", "Gewährleistungskosten", "% of revenue", "lower", "The cost of repairs and replacements under warranty as a share of revenue.", "Kosten für Reparaturen und Ersatz in der Gewährleistung als Anteil am Umsatz."],
    ["technician_utilisation", "Technician utilisation", "Auslastung der Servicetechniker", "% of paid hours", "higher", "Hours service technicians spend on billable work as a share of their paid hours.", "Stunden, die Servicetechniker mit abrechenbarer Arbeit verbringen, als Anteil ihrer bezahlten Stunden."],
    ["first_time_fix_rate", "First-time fix rate", "Erstlösungsquote", "% of service calls", "higher", "The share of service calls resolved on the first visit.", "Anteil der Serviceeinsätze, die beim ersten Besuch gelöst werden."],
    ["energy_cost_per_unit", "Energy cost per unit produced", "Energiekosten je Einheit", "EUR per unit", "lower", "Electricity, gas and other energy costs of production divided by the units produced.", "Strom-, Gas- und sonstige Energiekosten der Produktion geteilt durch die produzierten Einheiten."],
  ],
  energy_utilities: [
    ["customer_churn", "Supply customer churn", "Wechselquote der Versorgungskunden", "% of supply customers a year", "lower", "The share of supply customers at the start of a year who switch to another supplier during it.", "Anteil der Versorgungskunden zu Jahresbeginn, die im Lauf des Jahres den Anbieter wechseln."],
    ["cost_to_serve", "Cost to serve per customer", "Kosten je Kunde", "EUR per customer a year", "lower", "Billing, metering, service and sales costs divided by the customers served.", "Kosten für Abrechnung, Messung, Service und Vertrieb geteilt durch die versorgten Kunden."],
    ["gross_margin_per_mwh", "Gross margin per megawatt hour", "Bruttomarge je Megawattstunde", "EUR per MWh", "higher", "Sales revenue minus the cost of energy, grid fees and levies, divided by the megawatt hours sold.", "Erlöse abzüglich Energiebeschaffung, Netzentgelten und Umlagen, geteilt durch die verkauften Megawattstunden."],
    ["outage_minutes", "Minutes of grid outage per customer a year", "Unterbrechungsminuten je Kunde und Jahr", "minutes per customer a year", "lower", "Total minutes customers were without supply in a year, divided by the customers served (SAIDI, as IEEE 1366 defines it).", "Summe der Minuten ohne Versorgung in einem Jahr, geteilt durch die versorgten Kunden (SAIDI, wie IEEE 1366 es definiert).", SRC.ieee1366],
    ["smart_meter_share", "Share of smart meters installed", "Anteil intelligenter Messsysteme", "% of metering points", "higher", "Metering points with a smart meter gateway as a share of all metering points in the grid area.", "Messstellen mit intelligentem Messsystem als Anteil aller Messstellen im Netzgebiet."],
    ["bad_debt", "Bad debt", "Forderungsausfälle", "% of revenue", "lower", "Receivables written off as uncollectable, as a share of revenue.", "Als uneinbringlich abgeschriebene Forderungen, als Anteil am Umsatz."],
    ["heat_customers", "Heat customers connected", "Angeschlossene Wärmekunden", "buildings", "higher", "Buildings supplied by the utility's district or local heat networks.", "Gebäude, die über die Fern- oder Nahwärmenetze des Versorgers beliefert werden."],
    ["water_losses", "Water losses", "Wasserverluste", "% of water supplied", "lower", "Water put into the network that never reaches a billed customer, as a share of the water supplied.", "Wasser, das ins Netz eingespeist wird, aber keinen abgerechneten Kunden erreicht, als Anteil der eingespeisten Menge."],
    ["renewable_share", "Share of renewable power supplied", "Anteil erneuerbaren Stroms", "% of power supplied", "higher", "Power from renewable sources as a share of the power the utility supplies.", "Strom aus erneuerbaren Quellen als Anteil des gelieferten Stroms."],
  ],
  telecom: [
    ["arpu", "Average revenue per user", "Durchschnittlicher Umsatz je Kunde", "EUR per customer a month", "higher", "Service revenue in a month divided by the average number of customers.", "Serviceumsatz eines Monats geteilt durch die durchschnittliche Kundenzahl."],
    ["monthly_churn", "Monthly churn", "Monatliche Kündigungsrate", "% of customers a month", "lower", "The share of customers who cancel in a month.", "Anteil der Kunden, die in einem Monat kündigen."],
    ["net_additions", "Net additions", "Nettozugänge", "customers a year", "higher", "New customers minus customers lost in a year.", "Neukunden abzüglich verlorener Kunden in einem Jahr."],
    ["network_availability", "Network availability", "Netzverfügbarkeit", "% of time", "higher", "The share of time the network delivers the service as specified.", "Anteil der Zeit, in der das Netz den zugesagten Dienst erbringt."],
    ["fibre_take_up", "Fibre take-up rate", "Glasfaser-Anschlussquote", "% of homes passed", "higher", "Homes connected to fibre as a share of the homes the fibre network passes.", "Mit Glasfaser angeschlossene Haushalte als Anteil der vom Netz erreichten Haushalte."],
    ["homes_passed", "Homes passed by fibre", "Mit Glasfaser erschlossene Haushalte", "homes", "higher", "Homes the fibre network can connect without new street works.", "Haushalte, die das Glasfasernetz ohne neue Tiefbauarbeiten anschließen kann."],
    ["cost_per_gb", "Network cost per gigabyte", "Netzkosten je Gigabyte", "EUR per GB", "lower", "Network operating cost divided by the data carried.", "Betriebskosten des Netzes geteilt durch die transportierte Datenmenge."],
    ["population_coverage", "Population coverage", "Bevölkerungsabdeckung", "% of population", "higher", "The share of the population with outdoor coverage by the newest mobile generation the operator runs.", "Anteil der Bevölkerung mit Außenversorgung durch die neueste Mobilfunkgeneration des Betreibers."],
  ],
  automotive_mobility: [
    ["deliveries", "Vehicles delivered", "Ausgelieferte Fahrzeuge", "vehicles a year", "higher", "Vehicles handed over to customers in a year.", "In einem Jahr an Kunden übergebene Fahrzeuge."],
    ["average_transaction_price", "Average transaction price", "Durchschnittlicher Transaktionspreis", "EUR per vehicle", "higher", "Revenue from vehicles sold divided by the vehicles sold, after discounts.", "Erlös aus verkauften Fahrzeugen geteilt durch deren Zahl, nach Rabatten."],
    ["ev_share", "Share of electric vehicles in sales", "Anteil Elektrofahrzeuge am Absatz", "% of vehicles sold", "higher", "Battery-electric vehicles as a share of all vehicles sold.", "Batterieelektrische Fahrzeuge als Anteil aller verkauften Fahrzeuge."],
    ["fleet_co2", "Fleet CO2 emissions", "CO2-Flottenemissionen", "g CO2 per km", "lower", "The average type-approval CO2 emissions of the new cars sold in a year, as the EU fleet targets count them.", "Durchschnittliche CO2-Emissionen der in einem Jahr verkauften Neuwagen laut Typgenehmigung, wie die EU-Flottenziele sie zählen."],
    ["warranty_cost_per_vehicle", "Warranty cost per vehicle", "Gewährleistungskosten je Fahrzeug", "EUR per vehicle", "lower", "Warranty and recall costs divided by the vehicles sold.", "Gewährleistungs- und Rückrufkosten geteilt durch die verkauften Fahrzeuge."],
    ["capacity_utilisation", "Plant capacity utilisation", "Werksauslastung", "% of capacity", "higher", "Vehicles built as a share of what the plants can build.", "Gebaute Fahrzeuge als Anteil der Kapazität der Werke."],
    ["days_of_inventory", "Days of inventory", "Lagerreichweite", "days of sales", "lower", "Vehicles in stock divided by average daily sales.", "Fahrzeuge auf Lager geteilt durch den durchschnittlichen Tagesabsatz."],
    ["cost_per_vehicle", "Production cost per vehicle", "Herstellkosten je Fahrzeug", "EUR per vehicle", "lower", "Manufacturing cost divided by the vehicles built.", "Herstellkosten geteilt durch die gebauten Fahrzeuge."],
  ],
  retail_consumer: [
    ["like_for_like_growth", "Like-for-like sales growth", "Flächenbereinigtes Umsatzwachstum", "% a year", "higher", "Sales growth in stores and channels open in both years.", "Umsatzwachstum in Filialen und Kanälen, die in beiden Jahren geöffnet waren."],
    ["sales_per_sqm", "Sales per square metre", "Umsatz je Quadratmeter", "EUR per m² a year", "higher", "Store sales divided by the selling area.", "Filialumsatz geteilt durch die Verkaufsfläche."],
    ["average_basket", "Average basket", "Durchschnittlicher Bon", "EUR per purchase", "higher", "Sales divided by the number of purchases.", "Umsatz geteilt durch die Zahl der Einkäufe."],
    ["conversion_rate", "Conversion rate", "Konversionsrate", "% of visits", "higher", "The share of store or online visits that end in a purchase.", "Anteil der Besuche in Filiale oder Onlineshop, die mit einem Kauf enden."],
    ["gross_margin_return_on_inventory", "Gross margin return on inventory", "Bruttomarge je Euro Lagerbestand", "EUR per EUR of stock", "higher", "Gross margin in a year divided by the average stock at cost.", "Bruttomarge eines Jahres geteilt durch den durchschnittlichen Lagerbestand zu Einstandspreisen."],
    ["stock_turn", "Stock turn", "Lagerumschlag", "times a year", "higher", "Cost of goods sold divided by the average stock at cost.", "Wareneinsatz geteilt durch den durchschnittlichen Lagerbestand zu Einstandspreisen."],
    ["shrinkage", "Shrinkage", "Inventurdifferenz", "% of sales", "lower", "Stock lost to theft, damage and errors, as a share of sales.", "Durch Diebstahl, Schäden und Fehler verlorene Ware, als Anteil am Umsatz."],
    ["online_share", "Online share of sales", "Onlineanteil am Umsatz", "% of sales", "higher", "Sales through online channels as a share of total sales.", "Umsatz über Onlinekanäle als Anteil am Gesamtumsatz."],
  ],
  banking: [
    ["net_interest_margin", "Net interest margin", "Nettozinsmarge", "% of interest-earning assets", "higher", "Interest income minus interest expense, as a share of average interest-earning assets.", "Zinserträge abzüglich Zinsaufwand, als Anteil der durchschnittlichen zinstragenden Aktiva."],
    ["cost_income_ratio", "Cost-income ratio", "Aufwand-Ertrag-Verhältnis", "% of operating income", "lower", "Operating costs as a share of operating income.", "Verwaltungsaufwand als Anteil der operativen Erträge."],
    ["cet1_ratio", "CET1 ratio", "Harte Kernkapitalquote", "% of risk-weighted assets", "higher", "Common equity tier 1 capital as a share of risk-weighted assets, as the Basel Framework defines them.", "Hartes Kernkapital als Anteil der risikogewichteten Aktiva, wie das Basler Rahmenwerk sie definiert.", SRC.cet1],
    ["npl_ratio", "Non-performing loan ratio", "Quote notleidender Kredite", "% of loans", "lower", "Loans more than 90 days past due or unlikely to be repaid, as a share of all loans.", "Kredite, die mehr als 90 Tage überfällig sind oder voraussichtlich nicht zurückgezahlt werden, als Anteil aller Kredite."],
    ["cost_of_risk", "Cost of risk", "Risikokosten", "% of average loans", "lower", "Loan loss provisions in a year as a share of average loans.", "Risikovorsorge eines Jahres als Anteil des durchschnittlichen Kreditvolumens."],
    ["return_on_equity", "Return on equity", "Eigenkapitalrendite", "% of equity", "higher", "Net profit as a share of average shareholders' equity.", "Jahresüberschuss als Anteil des durchschnittlichen Eigenkapitals."],
    ["liquidity_coverage_ratio", "Liquidity coverage ratio", "Liquiditätsdeckungsquote", "% of net cash outflows", "higher", "High-quality liquid assets as a share of the net cash outflows of a 30-day stress scenario, as Basel III defines them.", "Hochliquide Aktiva als Anteil der Nettoabflüsse eines 30-tägigen Stressszenarios, wie Basel III sie definiert.", SRC.lcr],
    ["digitally_active_share", "Digitally active customers", "Digital aktive Kunden", "% of customers", "higher", "Customers who used online or mobile banking in the last 90 days, as a share of all customers.", "Kunden, die in den letzten 90 Tagen Online- oder Mobile-Banking genutzt haben, als Anteil aller Kunden."],
  ],
  insurance: [
    ["combined_ratio", "Combined ratio", "Schaden-Kosten-Quote", "% of net earned premium", "lower", "Claims and operating expenses as a share of net earned premium; below 100% means an underwriting profit.", "Schäden und Kosten als Anteil der verdienten Nettobeiträge; unter 100 % bedeutet einen versicherungstechnischen Gewinn."],
    ["loss_ratio", "Loss ratio", "Schadenquote", "% of earned premium", "lower", "Claims incurred as a share of earned premium.", "Schadenaufwand als Anteil der verdienten Beiträge."],
    ["expense_ratio", "Expense ratio", "Kostenquote", "% of earned premium", "lower", "Acquisition and administration costs as a share of earned premium.", "Abschluss- und Verwaltungskosten als Anteil der verdienten Beiträge."],
    ["solvency_ratio", "Solvency ratio", "Solvenzquote", "% of the solvency capital requirement", "higher", "Eligible own funds as a share of the solvency capital requirement under Solvency II.", "Anrechnungsfähige Eigenmittel als Anteil der Solvenzkapitalanforderung nach Solvency II.", SRC.solvency],
    ["gross_written_premium", "Gross written premium", "Gebuchte Bruttobeiträge", "EUR a year", "higher", "Premiums on all policies written in a year, before reinsurance.", "Beiträge aller in einem Jahr abgeschlossenen Verträge, vor Rückversicherung."],
    ["retention_rate", "Policy retention rate", "Vertragserhaltungsquote", "% of policies due", "higher", "The share of policies due for renewal that customers renew.", "Anteil der zur Verlängerung anstehenden Verträge, die Kunden verlängern."],
    ["claims_settlement_time", "Claims settlement time", "Schadenbearbeitungsdauer", "days", "lower", "Average days from a claim's notification to its payment.", "Durchschnittliche Tage von der Schadenmeldung bis zur Zahlung."],
    ["digital_claims_share", "Claims reported digitally", "Digital gemeldete Schäden", "% of claims", "higher", "Claims notified online or through an app as a share of all claims.", "Online oder per App gemeldete Schäden als Anteil aller Schäden."],
  ],
  health_life_sciences: [
    ["research_share", "Research spending", "Forschungsquote", "% of revenue", "higher", "Research and development spending as a share of revenue.", "Ausgaben für Forschung und Entwicklung als Anteil am Umsatz."],
    ["revenue_under_patent", "Revenue under patent", "Umsatz unter Patentschutz", "% of revenue", "higher", "Revenue from products still under patent or market exclusivity as a share of total revenue.", "Umsatz aus Produkten unter Patent- oder Marktexklusivität als Anteil am Gesamtumsatz."],
    ["approval_to_launch", "Approval to launch", "Zeit von Zulassung bis Markteinführung", "months", "lower", "Months from regulatory approval to the first sale in a market.", "Monate von der Zulassung bis zum ersten Verkauf in einem Markt."],
    ["average_length_of_stay", "Average length of stay", "Durchschnittliche Verweildauer", "days", "lower", "Inpatient days divided by the patients discharged.", "Belegungstage geteilt durch die entlassenen Patienten."],
    ["bed_occupancy", "Bed occupancy", "Bettenauslastung", "% of bed days", "higher", "Occupied bed days as a share of the bed days available.", "Belegte Bettentage als Anteil der verfügbaren Bettentage."],
    ["readmission_rate", "30-day readmission rate", "Wiederaufnahmerate in 30 Tagen", "% of discharges", "lower", "The share of discharged patients readmitted within 30 days.", "Anteil der entlassenen Patienten, die innerhalb von 30 Tagen wieder aufgenommen werden."],
    ["cost_per_case", "Cost per case", "Kosten je Fall", "EUR per case", "lower", "Operating cost divided by the cases treated.", "Betriebskosten geteilt durch die behandelten Fälle."],
    ["batch_failure_rate", "Batch failure rate", "Chargenausfallquote", "% of batches", "lower", "The share of production batches that fail quality release.", "Anteil der Produktionschargen, die die Qualitätsfreigabe nicht bestehen."],
  ],
  public_sector: [
    ["cost_per_case", "Cost per case processed", "Kosten je bearbeitetem Vorgang", "EUR per case", "lower", "Running cost of a service divided by the cases it processes.", "Laufende Kosten einer Leistung geteilt durch die bearbeiteten Vorgänge."],
    ["processing_time", "Processing time", "Bearbeitungsdauer", "days", "lower", "Average days from a complete application to a decision.", "Durchschnittliche Tage vom vollständigen Antrag bis zur Entscheidung."],
    ["online_services_share", "Share of services online", "Anteil digital angebotener Leistungen", "% of services", "higher", "Services that citizens and businesses can complete online, as a share of all services offered.", "Leistungen, die Bürger und Unternehmen vollständig online erledigen können, als Anteil aller angebotenen Leistungen."],
    ["citizen_satisfaction", "Citizen satisfaction", "Bürgerzufriedenheit", "% of users satisfied", "higher", "The share of users who rate the service as good or very good in a survey.", "Anteil der Nutzer, die die Leistung in einer Befragung als gut oder sehr gut bewerten."],
    ["budget_execution", "Budget execution rate", "Mittelabflussquote", "% of the budget", "higher", "Spending as a share of the budget approved for the year.", "Ausgaben als Anteil des für das Jahr bewilligten Budgets."],
    ["vacancy_rate", "Staff vacancy rate", "Quote unbesetzter Stellen", "% of posts", "lower", "Unfilled posts as a share of all budgeted posts.", "Unbesetzte Stellen als Anteil aller Planstellen."],
    ["open_cases", "Open cases", "Offene Vorgänge", "cases", "lower", "Cases waiting for a decision at the end of a period.", "Vorgänge, die am Ende eines Zeitraums auf eine Entscheidung warten."],
    ["building_energy", "Energy use of buildings", "Energieverbrauch der Gebäude", "kWh per m² a year", "lower", "Heat and power used by public buildings divided by their floor area.", "Wärme- und Stromverbrauch öffentlicher Gebäude geteilt durch ihre Fläche."],
  ],
  software_digital: [
    ["annual_recurring_revenue", "Annual recurring revenue", "Jährlich wiederkehrender Umsatz", "EUR", "higher", "Subscription revenue under contract, expressed for a full year.", "Vertraglich gesicherter Abonnementumsatz, auf ein volles Jahr gerechnet."],
    ["net_revenue_retention", "Net revenue retention", "Netto-Umsatzbindung", "% of last year's revenue", "higher", "Recurring revenue this year from customers who were customers a year ago, as a share of their revenue then, upgrades and losses included.", "Wiederkehrender Umsatz dieses Jahres von Kunden, die es vor einem Jahr schon waren, als Anteil ihres damaligen Umsatzes, mit Erweiterungen und Verlusten."],
    ["monthly_active_users", "Monthly active users", "Monatlich aktive Nutzer", "users", "higher", "Distinct users who used the product in the last 30 days.", "Verschiedene Nutzer, die das Produkt in den letzten 30 Tagen genutzt haben."],
    ["uptime", "Service uptime", "Verfügbarkeit des Dienstes", "% of time", "higher", "The share of time the service is available as the contract defines it.", "Anteil der Zeit, in der der Dienst laut Vertrag verfügbar ist."],
    ["acquisition_payback", "Payback period on customer acquisition", "Amortisationsdauer der Kundengewinnung", "months", "lower", "Months of gross margin from a new customer needed to recover the cost of winning them.", "Monate Bruttomarge eines Neukunden, die nötig sind, um die Kosten seiner Gewinnung zurückzuverdienen."],
    ["rule_of_40", "Rule of 40", "Rule of 40", "% points", "higher", "Revenue growth rate plus free cash flow margin, both in percent.", "Umsatzwachstum plus Free-Cashflow-Marge, beide in Prozent."],
    ["deployment_frequency", "Deployment frequency", "Release-Häufigkeit", "releases a week", "higher", "How often changes reach production.", "Wie oft Änderungen in den Produktivbetrieb gehen."],
    ["security_incidents", "Security incidents", "Sicherheitsvorfälle", "incidents a year", "lower", "Incidents that compromised the confidentiality, integrity or availability of the service or its data.", "Vorfälle, die Vertraulichkeit, Integrität oder Verfügbarkeit des Dienstes oder seiner Daten beeinträchtigt haben."],
  ],
  chemicals_materials: [
    ["capacity_utilisation", "Capacity utilisation", "Kapazitätsauslastung", "% of capacity", "higher", "Output as a share of what the plants can produce.", "Produktion als Anteil der Kapazität der Anlagen."],
    ["energy_cost_per_tonne", "Energy cost per tonne", "Energiekosten je Tonne", "EUR per t", "lower", "Energy costs of production divided by the tonnes produced.", "Energiekosten der Produktion geteilt durch die produzierten Tonnen."],
    ["co2_per_tonne", "CO2 per tonne of product", "CO2 je Tonne Produkt", "t CO2e per t", "lower", "Scope 1 and 2 emissions in CO2 equivalents divided by the tonnes produced.", "Emissionen der Scopes 1 und 2 in CO2-Äquivalenten geteilt durch die produzierten Tonnen."],
    ["raw_material_cost_share", "Raw material cost share", "Rohstoffkostenanteil", "% of revenue", "lower", "Cost of raw materials as a share of revenue.", "Rohstoffkosten als Anteil am Umsatz."],
    ["plant_availability", "Plant availability", "Anlagenverfügbarkeit", "% of planned time", "higher", "The share of planned operating time the plants actually run.", "Anteil der geplanten Betriebszeit, in der die Anlagen tatsächlich laufen."],
    ["lost_time_injury_frequency", "Lost-time injury frequency", "Unfallhäufigkeit mit Ausfallzeit", "injuries per million hours worked", "lower", "Injuries that cost at least one working day, per million hours worked.", "Unfälle mit mindestens einem Ausfalltag je Million Arbeitsstunden."],
    ["working_capital_days", "Working capital days", "Kapitalbindung in Tagen", "days of revenue", "lower", "Receivables plus inventory minus payables, in days of revenue.", "Forderungen plus Vorräte abzüglich Verbindlichkeiten, in Tagen Umsatz."],
    ["specialty_share", "Share of specialty products", "Anteil Spezialprodukte", "% of revenue", "higher", "Revenue from specialty products as a share of total revenue.", "Umsatz mit Spezialprodukten als Anteil am Gesamtumsatz."],
  ],
};

/** Every KPI of the library, sector by sector. */
export const KPIS = Object.freeze(Object.entries(ROWS).flatMap(([sector, rows]) => rows.map(([name, en, de, unit, better, defEn, defDe, source = COMMON_PRACTICE]) => Object.freeze({
  id: `${sector}.${name}`,
  sector,
  name: Object.freeze({ en, de }),
  unit,
  better,
  definition: Object.freeze({ en: defEn, de: defDe }),
  source,
}))));

/** The KPIs an agent may pick for a company of `sector`: the sector's own, then the general ones. */
export function kpisFor(sector) {
  return [...KPIS.filter((k) => k.sector === sector && sector !== "general"), ...KPIS.filter((k) => k.sector === "general")];
}

/** One KPI by its id, or null. */
export function kpi(id) {
  return KPIS.find((k) => k.id === id) || null;
}
