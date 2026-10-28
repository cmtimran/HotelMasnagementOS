/**
 * Standardized Geographic Data for HotelManagementOS
 * Complete Sovereign Countries Database (~195+ Countries) with Dialing Codes, Nationalities, and Major Cities
 */

export interface CountryInfo {
    name: string;
    code: string;
    dialCode: string;
    nationality: string;
    cities: string[];
}

export const COUNTRIES_DATABASE: CountryInfo[] = [
    {
        "name": "Bangladesh",
        "code": "BD",
        "dialCode": "+880",
        "nationality": "Bangladeshi",
        "cities": [
            "Dhaka",
            "Chittagong",
            "Cox's Bazar",
            "Sylhet",
            "Rajshahi",
            "Khulna",
            "Barishal",
            "Rangpur",
            "Mymensingh",
            "Gazipur",
            "Narayanganj",
            "Comilla",
            "Bogura",
            "Jessore",
            "Kushtia",
            "Tangail",
            "Pabna",
            "Dinajpur",
            "Feni",
            "Brahmanbaria",
            "Coxsbazar",
            "Sreemangal",
            "Bandarban",
            "Rangamati"
        ]
    },
    {
        "name": "India",
        "code": "IN",
        "dialCode": "+91",
        "nationality": "Indian",
        "cities": [
            "New Delhi",
            "Kolkata",
            "Mumbai",
            "Bengaluru",
            "Chennai",
            "Hyderabad",
            "Ahmedabad",
            "Pune",
            "Jaipur",
            "Agra",
            "Lucknow",
            "Chandigarh",
            "Guwahati",
            "Goa",
            "Kochi"
        ]
    },
    {
        "name": "United States",
        "code": "US",
        "dialCode": "+1",
        "nationality": "American",
        "cities": [
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Miami",
            "San Francisco",
            "Dallas",
            "Atlanta",
            "Washington, D.C.",
            "Boston",
            "Seattle",
            "Las Vegas",
            "Orlando",
            "Denver",
            "Austin"
        ]
    },
    {
        "name": "United Kingdom",
        "code": "GB",
        "dialCode": "+44",
        "nationality": "British",
        "cities": [
            "London",
            "Manchester",
            "Birmingham",
            "Edinburgh",
            "Glasgow",
            "Liverpool",
            "Leeds",
            "Bristol",
            "Cardiff",
            "Belfast",
            "Cambridge",
            "Oxford"
        ]
    },
    {
        "name": "United Arab Emirates",
        "code": "AE",
        "dialCode": "+971",
        "nationality": "Emirati",
        "cities": [
            "Dubai",
            "Abu Dhabi",
            "Sharjah",
            "Ajman",
            "Ras Al Khaimah",
            "Fujairah",
            "Al Ain"
        ]
    },
    {
        "name": "Saudi Arabia",
        "code": "SA",
        "dialCode": "+966",
        "nationality": "Saudi",
        "cities": [
            "Riyadh",
            "Jeddah",
            "Mecca",
            "Medina",
            "Dammam",
            "Khobar",
            "Tabuk",
            "Abha"
        ]
    },
    {
        "name": "Canada",
        "code": "CA",
        "dialCode": "+1",
        "nationality": "Canadian",
        "cities": [
            "Toronto",
            "Vancouver",
            "Montreal",
            "Calgary",
            "Ottawa",
            "Edmonton",
            "Quebec City",
            "Winnipeg"
        ]
    },
    {
        "name": "Australia",
        "code": "AU",
        "dialCode": "+61",
        "nationality": "Australian",
        "cities": [
            "Sydney",
            "Melbourne",
            "Brisbane",
            "Perth",
            "Adelaide",
            "Gold Coast",
            "Canberra",
            "Hobart"
        ]
    },
    {
        "name": "Malaysia",
        "code": "MY",
        "dialCode": "+60",
        "nationality": "Malaysian",
        "cities": [
            "Kuala Lumpur",
            "Penang",
            "Johor Bahru",
            "Malacca",
            "Kota Kinabalu",
            "Kuching",
            "Langkawi"
        ]
    },
    {
        "name": "Singapore",
        "code": "SG",
        "dialCode": "+65",
        "nationality": "Singaporean",
        "cities": [
            "Singapore",
            "Sentosa",
            "Jurong",
            "Changi"
        ]
    },
    {
        "name": "Thailand",
        "code": "TH",
        "dialCode": "+66",
        "nationality": "Thai",
        "cities": [
            "Bangkok",
            "Phuket",
            "Chiang Mai",
            "Pattaya",
            "Krabi",
            "Hua Hin",
            "Koh Samui"
        ]
    },
    {
        "name": "China",
        "code": "CN",
        "dialCode": "+86",
        "nationality": "Chinese",
        "cities": [
            "Beijing",
            "Shanghai",
            "Guangzhou",
            "Shenzhen",
            "Chengdu",
            "Hangzhou",
            "Wuhan",
            "Hong Kong",
            "Macau"
        ]
    },
    {
        "name": "Japan",
        "code": "JP",
        "dialCode": "+81",
        "nationality": "Japanese",
        "cities": [
            "Tokyo",
            "Osaka",
            "Kyoto",
            "Yokohama",
            "Nagoya",
            "Fukuoka",
            "Sapporo",
            "Kobe"
        ]
    },
    {
        "name": "Qatar",
        "code": "QA",
        "dialCode": "+974",
        "nationality": "Qatari",
        "cities": [
            "Doha",
            "Al Rayyan",
            "Al Wakrah",
            "Lusail",
            "Al Khor"
        ]
    },
    {
        "name": "Oman",
        "code": "OM",
        "dialCode": "+968",
        "nationality": "Omani",
        "cities": [
            "Muscat",
            "Salalah",
            "Sohar",
            "Nizwa",
            "Sur"
        ]
    },
    {
        "name": "Kuwait",
        "code": "KW",
        "dialCode": "+965",
        "nationality": "Kuwaiti",
        "cities": [
            "Kuwait City",
            "Al Ahmadi",
            "Hawalli",
            "Salmiya",
            "Farwaniya"
        ]
    },
    {
        "name": "Bahrain",
        "code": "BH",
        "dialCode": "+973",
        "nationality": "Bahraini",
        "cities": [
            "Manama",
            "Riffa",
            "Muharraq",
            "Hamad Town"
        ]
    },
    {
        "name": "Germany",
        "code": "DE",
        "dialCode": "+49",
        "nationality": "German",
        "cities": [
            "Berlin",
            "Munich",
            "Frankfurt",
            "Hamburg",
            "Cologne",
            "Stuttgart",
            "Düsseldorf",
            "Dresden"
        ]
    },
    {
        "name": "France",
        "code": "FR",
        "dialCode": "+33",
        "nationality": "French",
        "cities": [
            "Paris",
            "Marseille",
            "Lyon",
            "Nice",
            "Toulouse",
            "Bordeaux",
            "Strasbourg",
            "Cannes"
        ]
    },
    {
        "name": "Italy",
        "code": "IT",
        "dialCode": "+39",
        "nationality": "Italian",
        "cities": [
            "Rome",
            "Milan",
            "Florence",
            "Venice",
            "Naples",
            "Turin",
            "Bologna",
            "Palermo"
        ]
    },
    {
        "name": "Spain",
        "code": "ES",
        "dialCode": "+34",
        "nationality": "Spanish",
        "cities": [
            "Madrid",
            "Barcelona",
            "Valencia",
            "Seville",
            "Malaga",
            "Bilbao",
            "Ibiza",
            "Palma"
        ]
    },
    {
        "name": "Turkey",
        "code": "TR",
        "dialCode": "+90",
        "nationality": "Turkish",
        "cities": [
            "Istanbul",
            "Ankara",
            "Antalya",
            "Izmir",
            "Bursa",
            "Bodrum",
            "Trabzon"
        ]
    },
    {
        "name": "Pakistan",
        "code": "PK",
        "dialCode": "+92",
        "nationality": "Pakistani",
        "cities": [
            "Islamabad",
            "Karachi",
            "Lahore",
            "Rawalpindi",
            "Peshawar",
            "Faisalabad",
            "Multan",
            "Quetta"
        ]
    },
    {
        "name": "Sri Lanka",
        "code": "LK",
        "dialCode": "+94",
        "nationality": "Sri Lankan",
        "cities": [
            "Colombo",
            "Kandy",
            "Galle",
            "Negombo",
            "Jaffna",
            "Nuwara Eliya"
        ]
    },
    {
        "name": "Nepal",
        "code": "NP",
        "dialCode": "+977",
        "nationality": "Nepalese",
        "cities": [
            "Kathmandu",
            "Pokhara",
            "Lalitpur",
            "Biratnagar",
            "Bharatpur",
            "Lumbini"
        ]
    },
    {
        "name": "Bhutan",
        "code": "BT",
        "dialCode": "+975",
        "nationality": "Bhutanese",
        "cities": [
            "Thimphu",
            "Paro",
            "Phuntsholing",
            "Punakha"
        ]
    },
    {
        "name": "Maldives",
        "code": "MV",
        "dialCode": "+960",
        "nationality": "Maldivian",
        "cities": [
            "Male",
            "Hulhumale",
            "Maafushi",
            "Addu City"
        ]
    },
    {
        "name": "Indonesia",
        "code": "ID",
        "dialCode": "+62",
        "nationality": "Indonesian",
        "cities": [
            "Jakarta",
            "Bali",
            "Surabaya",
            "Bandung",
            "Medan",
            "Yogyakarta"
        ]
    },
    {
        "name": "Vietnam",
        "code": "VN",
        "dialCode": "+84",
        "nationality": "Vietnamese",
        "cities": [
            "Hanoi",
            "Ho Chi Minh City",
            "Da Nang",
            "Nha Trang",
            "Hoi An"
        ]
    },
    {
        "name": "Philippines",
        "code": "PH",
        "dialCode": "+63",
        "nationality": "Filipino",
        "cities": [
            "Manila",
            "Cebu City",
            "Davao City",
            "Quezon City",
            "Boracay"
        ]
    },
    {
        "name": "South Korea",
        "code": "KR",
        "dialCode": "+82",
        "nationality": "South Korean",
        "cities": [
            "Seoul",
            "Busan",
            "Incheon",
            "Daegu",
            "Jeju"
        ]
    },
    {
        "name": "Egypt",
        "code": "EG",
        "dialCode": "+20",
        "nationality": "Egyptian",
        "cities": [
            "Cairo",
            "Alexandria",
            "Giza",
            "Sharm El Sheikh",
            "Hurghada",
            "Luxor"
        ]
    },
    {
        "name": "South Africa",
        "code": "ZA",
        "dialCode": "+27",
        "nationality": "South African",
        "cities": [
            "Johannesburg",
            "Cape Town",
            "Durban",
            "Pretoria",
            "Port Elizabeth"
        ]
    },
    {
        "name": "Russia",
        "code": "RU",
        "dialCode": "+7",
        "nationality": "Russian",
        "cities": [
            "Moscow",
            "Saint Petersburg",
            "Novosibirsk",
            "Yekaterinburg",
            "Kazan",
            "Sochi"
        ]
    },
    {
        "name": "Brazil",
        "code": "BR",
        "dialCode": "+55",
        "nationality": "Brazilian",
        "cities": [
            "Sao Paulo",
            "Rio de Janeiro",
            "Brasilia",
            "Salvador",
            "Fortaleza"
        ]
    },
    {
        "name": "Mexico",
        "code": "MX",
        "dialCode": "+52",
        "nationality": "Mexican",
        "cities": [
            "Mexico City",
            "Cancun",
            "Guadalajara",
            "Monterrey",
            "Tijuana"
        ]
    },
    {
        "name": "Netherlands",
        "code": "NL",
        "dialCode": "+31",
        "nationality": "Dutch",
        "cities": [
            "Amsterdam",
            "Rotterdam",
            "The Hague",
            "Utrecht",
            "Eindhoven"
        ]
    },
    {
        "name": "Switzerland",
        "code": "CH",
        "dialCode": "+41",
        "nationality": "Swiss",
        "cities": [
            "Zurich",
            "Geneva",
            "Basel",
            "Bern",
            "Lausanne",
            "Lucerne"
        ]
    },
    {
        "name": "Sweden",
        "code": "SE",
        "dialCode": "+46",
        "nationality": "Swedish",
        "cities": [
            "Stockholm",
            "Gothenburg",
            "Malmo",
            "Uppsala"
        ]
    },
    {
        "name": "Norway",
        "code": "NO",
        "dialCode": "+47",
        "nationality": "Norwegian",
        "cities": [
            "Oslo",
            "Bergen",
            "Trondheim",
            "Stavanger"
        ]
    },
    {
        "name": "Denmark",
        "code": "DK",
        "dialCode": "+45",
        "nationality": "Danish",
        "cities": [
            "Copenhagen",
            "Aarhus",
            "Odense",
            "Aalborg"
        ]
    },
    {
        "name": "Finland",
        "code": "FI",
        "dialCode": "+358",
        "nationality": "Finnish",
        "cities": [
            "Helsinki",
            "Espoo",
            "Tampere",
            "Vantaa",
            "Oulu"
        ]
    },
    {
        "name": "Belgium",
        "code": "BE",
        "dialCode": "+32",
        "nationality": "Belgian",
        "cities": [
            "Brussels",
            "Antwerp",
            "Ghent",
            "Bruges",
            "Liege"
        ]
    },
    {
        "name": "Austria",
        "code": "AT",
        "dialCode": "+43",
        "nationality": "Austrian",
        "cities": [
            "Vienna",
            "Salzburg",
            "Innsbruck",
            "Graz",
            "Linz"
        ]
    },
    {
        "name": "Poland",
        "code": "PL",
        "dialCode": "+48",
        "nationality": "Polish",
        "cities": [
            "Warsaw",
            "Krakow",
            "Wroclaw",
            "Gdansk",
            "Poznan"
        ]
    },
    {
        "name": "Portugal",
        "code": "PT",
        "dialCode": "+351",
        "nationality": "Portuguese",
        "cities": [
            "Lisbon",
            "Porto",
            "Faro",
            "Coimbra",
            "Braga"
        ]
    },
    {
        "name": "Greece",
        "code": "GR",
        "dialCode": "+30",
        "nationality": "Greek",
        "cities": [
            "Athens",
            "Thessaloniki",
            "Heraklion",
            "Santorini",
            "Mykonos"
        ]
    },
    {
        "name": "Ireland",
        "code": "IE",
        "dialCode": "+353",
        "nationality": "Irish",
        "cities": [
            "Dublin",
            "Cork",
            "Galway",
            "Limerick"
        ]
    },
    {
        "name": "New Zealand",
        "code": "NZ",
        "dialCode": "+64",
        "nationality": "New Zealander",
        "cities": [
            "Auckland",
            "Wellington",
            "Christchurch",
            "Queenstown"
        ]
    },
    {
        "name": "Afghanistan",
        "code": "AF",
        "dialCode": "+93",
        "nationality": "Afghan",
        "cities": [
            "Kabul",
            "Herat",
            "Kandahar",
            "Mazar-i-Sharif"
        ]
    },
    {
        "name": "Albania",
        "code": "AL",
        "dialCode": "+355",
        "nationality": "Albanian",
        "cities": [
            "Tirana",
            "Durres",
            "Vlore",
            "Shkoder"
        ]
    },
    {
        "name": "Algeria",
        "code": "DZ",
        "dialCode": "+213",
        "nationality": "Algerian",
        "cities": [
            "Algiers",
            "Oran",
            "Constantine",
            "Annaba"
        ]
    },
    {
        "name": "Andorra",
        "code": "AD",
        "dialCode": "+376",
        "nationality": "Andorran",
        "cities": [
            "Andorra la Vella",
            "Escaldes-Engordany",
            "Encamp"
        ]
    },
    {
        "name": "Angola",
        "code": "AO",
        "dialCode": "+244",
        "nationality": "Angolan",
        "cities": [
            "Luanda",
            "Huambo",
            "Lobito",
            "Benguela"
        ]
    },
    {
        "name": "Antigua and Barbuda",
        "code": "AG",
        "dialCode": "+1268",
        "nationality": "Antiguan",
        "cities": [
            "St. John's",
            "All Saints",
            "Liberta"
        ]
    },
    {
        "name": "Argentina",
        "code": "AR",
        "dialCode": "+54",
        "nationality": "Argentine",
        "cities": [
            "Buenos Aires",
            "Cordoba",
            "Rosario",
            "Mendoza"
        ]
    },
    {
        "name": "Armenia",
        "code": "AM",
        "dialCode": "+374",
        "nationality": "Armenian",
        "cities": [
            "Yerevan",
            "Gyumri",
            "Vanadzor"
        ]
    },
    {
        "name": "Azerbaijan",
        "code": "AZ",
        "dialCode": "+994",
        "nationality": "Azerbaijani",
        "cities": [
            "Baku",
            "Ganja",
            "Sumqayit"
        ]
    },
    {
        "name": "Bahamas",
        "code": "BS",
        "dialCode": "+1242",
        "nationality": "Bahamian",
        "cities": [
            "Nassau",
            "Freeport",
            "West End"
        ]
    },
    {
        "name": "Barbados",
        "code": "BB",
        "dialCode": "+1246",
        "nationality": "Barbadian",
        "cities": [
            "Bridgetown",
            "Speightstown",
            "Oistins"
        ]
    },
    {
        "name": "Belarus",
        "code": "BY",
        "dialCode": "+375",
        "nationality": "Belarusian",
        "cities": [
            "Minsk",
            "Gomel",
            "Mogilev",
            "Vitebsk"
        ]
    },
    {
        "name": "Belize",
        "code": "BZ",
        "dialCode": "+501",
        "nationality": "Belizean",
        "cities": [
            "Belize City",
            "Belmopan",
            "San Ignacio",
            "San Pedro"
        ]
    },
    {
        "name": "Benin",
        "code": "BJ",
        "dialCode": "+229",
        "nationality": "Beninese",
        "cities": [
            "Porto-Novo",
            "Cotonou",
            "Parakou"
        ]
    },
    {
        "name": "Bolivia",
        "code": "BO",
        "dialCode": "+591",
        "nationality": "Bolivian",
        "cities": [
            "La Paz",
            "Santa Cruz",
            "Cochabamba",
            "Sucre"
        ]
    },
    {
        "name": "Bosnia and Herzegovina",
        "code": "BA",
        "dialCode": "+387",
        "nationality": "Bosnian",
        "cities": [
            "Sarajevo",
            "Banja Luka",
            "Tuzla",
            "Mostar"
        ]
    },
    {
        "name": "Botswana",
        "code": "BW",
        "dialCode": "+267",
        "nationality": "Motswana",
        "cities": [
            "Gaborone",
            "Francistown",
            "Maun"
        ]
    },
    {
        "name": "Brunei",
        "code": "BN",
        "dialCode": "+673",
        "nationality": "Bruneian",
        "cities": [
            "Bandar Seri Begawan",
            "Kuala Belait",
            "Seria"
        ]
    },
    {
        "name": "Bulgaria",
        "code": "BG",
        "dialCode": "+359",
        "nationality": "Bulgarian",
        "cities": [
            "Sofia",
            "Plovdiv",
            "Varna",
            "Burgas"
        ]
    },
    {
        "name": "Burkina Faso",
        "code": "BF",
        "dialCode": "+226",
        "nationality": "Burkinabe",
        "cities": [
            "Ouagadougou",
            "Bobo-Dioulasso",
            "Koudougou"
        ]
    },
    {
        "name": "Burundi",
        "code": "BI",
        "dialCode": "+257",
        "nationality": "Burundian",
        "cities": [
            "Gitega",
            "Bujumbura",
            "Ngozi"
        ]
    },
    {
        "name": "Cabo Verde",
        "code": "CV",
        "dialCode": "+238",
        "nationality": "Cabo Verdean",
        "cities": [
            "Praia",
            "Mindelo",
            "Santa Maria"
        ]
    },
    {
        "name": "Cambodia",
        "code": "KH",
        "dialCode": "+855",
        "nationality": "Cambodian",
        "cities": [
            "Phnom Penh",
            "Siem Reap",
            "Battambang",
            "Sihanoukville"
        ]
    },
    {
        "name": "Cameroon",
        "code": "CM",
        "dialCode": "+237",
        "nationality": "Cameroonian",
        "cities": [
            "Yaounde",
            "Douala",
            "Garoua",
            "Bamenda"
        ]
    },
    {
        "name": "Central African Republic",
        "code": "CF",
        "dialCode": "+236",
        "nationality": "Central African",
        "cities": [
            "Bangui",
            "Bimbo",
            "Berberati"
        ]
    },
    {
        "name": "Chad",
        "code": "TD",
        "dialCode": "+235",
        "nationality": "Chadian",
        "cities": [
            "N'Djamena",
            "Moundou",
            "Sarh"
        ]
    },
    {
        "name": "Chile",
        "code": "CL",
        "dialCode": "+56",
        "nationality": "Chilean",
        "cities": [
            "Santiago",
            "Valparaiso",
            "Concepcion",
            "Vina del Mar"
        ]
    },
    {
        "name": "Colombia",
        "code": "CO",
        "dialCode": "+57",
        "nationality": "Colombian",
        "cities": [
            "Bogota",
            "Medellin",
            "Cali",
            "Barranquilla",
            "Cartagena"
        ]
    },
    {
        "name": "Comoros",
        "code": "KM",
        "dialCode": "+269",
        "nationality": "Comorian",
        "cities": [
            "Moroni",
            "Mutsamudu",
            "Fomboni"
        ]
    },
    {
        "name": "Congo (Republic)",
        "code": "CG",
        "dialCode": "+242",
        "nationality": "Congolese",
        "cities": [
            "Brazzaville",
            "Pointe-Noire",
            "Dolisie"
        ]
    },
    {
        "name": "Congo (DRC)",
        "code": "CD",
        "dialCode": "+243",
        "nationality": "Congolese",
        "cities": [
            "Kinshasa",
            "Lubumbashi",
            "Mbuji-Mayi",
            "Goma"
        ]
    },
    {
        "name": "Costa Rica",
        "code": "CR",
        "dialCode": "+506",
        "nationality": "Costa Rican",
        "cities": [
            "San Jose",
            "Alajuela",
            "Cartago",
            "Heredia"
        ]
    },
    {
        "name": "Croatia",
        "code": "HR",
        "dialCode": "+385",
        "nationality": "Croatian",
        "cities": [
            "Zagreb",
            "Split",
            "Dubrovnik",
            "Rijeka",
            "Zadar"
        ]
    },
    {
        "name": "Cuba",
        "code": "CU",
        "dialCode": "+53",
        "nationality": "Cuban",
        "cities": [
            "Havana",
            "Santiago de Cuba",
            "Camaguey",
            "Varadero"
        ]
    },
    {
        "name": "Cyprus",
        "code": "CY",
        "dialCode": "+357",
        "nationality": "Cypriot",
        "cities": [
            "Nicosia",
            "Limassol",
            "Larnaca",
            "Paphos"
        ]
    },
    {
        "name": "Czech Republic",
        "code": "CZ",
        "dialCode": "+420",
        "nationality": "Czech",
        "cities": [
            "Prague",
            "Brno",
            "Ostrava",
            "Plzen"
        ]
    },
    {
        "name": "Djibouti",
        "code": "DJ",
        "dialCode": "+253",
        "nationality": "Djiboutian",
        "cities": [
            "Djibouti City",
            "Ali Sabieh",
            "Tadjoura"
        ]
    },
    {
        "name": "Dominica",
        "code": "DM",
        "dialCode": "+1767",
        "nationality": "Dominican",
        "cities": [
            "Roseau",
            "Portsmouth",
            "Marigot"
        ]
    },
    {
        "name": "Dominican Republic",
        "code": "DO",
        "dialCode": "+1809",
        "nationality": "Dominican",
        "cities": [
            "Santo Domingo",
            "Santiago",
            "Punta Cana",
            "Puerto Plata"
        ]
    },
    {
        "name": "Ecuador",
        "code": "EC",
        "dialCode": "+593",
        "nationality": "Ecuadorian",
        "cities": [
            "Quito",
            "Guayaquil",
            "Cuenca",
            "Manta"
        ]
    },
    {
        "name": "El Salvador",
        "code": "SV",
        "dialCode": "+503",
        "nationality": "Salvadoran",
        "cities": [
            "San Salvador",
            "Santa Ana",
            "San Miguel"
        ]
    },
    {
        "name": "Equatorial Guinea",
        "code": "GQ",
        "dialCode": "+240",
        "nationality": "Equatoguinean",
        "cities": [
            "Malabo",
            "Bata",
            "Oyala"
        ]
    },
    {
        "name": "Eritrea",
        "code": "ER",
        "dialCode": "+291",
        "nationality": "Eritrean",
        "cities": [
            "Asmara",
            "Keren",
            "Massawa"
        ]
    },
    {
        "name": "Estonia",
        "code": "EE",
        "dialCode": "+372",
        "nationality": "Estonian",
        "cities": [
            "Tallinn",
            "Tartu",
            "Narva",
            "Parnu"
        ]
    },
    {
        "name": "Eswatini",
        "code": "SZ",
        "dialCode": "+268",
        "nationality": "Swazi",
        "cities": [
            "Mbabane",
            "Manzini",
            "Big Bend"
        ]
    },
    {
        "name": "Ethiopia",
        "code": "ET",
        "dialCode": "+251",
        "nationality": "Ethiopian",
        "cities": [
            "Addis Ababa",
            "Dire Dawa",
            "Mekele",
            "Gondar"
        ]
    },
    {
        "name": "Fiji",
        "code": "FJ",
        "dialCode": "+679",
        "nationality": "Fijian",
        "cities": [
            "Suva",
            "Nadi",
            "Lautoka"
        ]
    },
    {
        "name": "Gabon",
        "code": "GA",
        "dialCode": "+241",
        "nationality": "Gabonese",
        "cities": [
            "Libreville",
            "Port-Gentil",
            "Franceville"
        ]
    },
    {
        "name": "Gambia",
        "code": "GM",
        "dialCode": "+220",
        "nationality": "Gambian",
        "cities": [
            "Banjul",
            "Serekunda",
            "Brikama"
        ]
    },
    {
        "name": "Georgia",
        "code": "GE",
        "dialCode": "+995",
        "nationality": "Georgian",
        "cities": [
            "Tbilisi",
            "Batumi",
            "Kutaisi",
            "Rustavi"
        ]
    },
    {
        "name": "Ghana",
        "code": "GH",
        "dialCode": "+233",
        "nationality": "Ghanaian",
        "cities": [
            "Accra",
            "Kumasi",
            "Tamale",
            "Takoradi"
        ]
    },
    {
        "name": "Grenada",
        "code": "GD",
        "dialCode": "+1473",
        "nationality": "Grenadian",
        "cities": [
            "St. George's",
            "Gouyave",
            "Grenville"
        ]
    },
    {
        "name": "Guatemala",
        "code": "GT",
        "dialCode": "+502",
        "nationality": "Guatemalan",
        "cities": [
            "Guatemala City",
            "Antigua",
            "Quetzaltenango",
            "Escuintla"
        ]
    },
    {
        "name": "Guinea",
        "code": "GN",
        "dialCode": "+224",
        "nationality": "Guinean",
        "cities": [
            "Conakry",
            "Nzerekore",
            "Kankan"
        ]
    },
    {
        "name": "Guinea-Bissau",
        "code": "GW",
        "dialCode": "+245",
        "nationality": "Bissau-Guinean",
        "cities": [
            "Bissau",
            "Bafata",
            "Gabu"
        ]
    },
    {
        "name": "Guyana",
        "code": "GY",
        "dialCode": "+592",
        "nationality": "Guyanese",
        "cities": [
            "Georgetown",
            "Linden",
            "New Amsterdam"
        ]
    },
    {
        "name": "Haiti",
        "code": "HT",
        "dialCode": "+509",
        "nationality": "Haitian",
        "cities": [
            "Port-au-Prince",
            "Cap-Haitien",
            "Gonaives"
        ]
    },
    {
        "name": "Honduras",
        "code": "HN",
        "dialCode": "+504",
        "nationality": "Honduran",
        "cities": [
            "Tegucigalpa",
            "San Pedro Sula",
            "La Ceiba",
            "Roatan"
        ]
    },
    {
        "name": "Hungary",
        "code": "HU",
        "dialCode": "+36",
        "nationality": "Hungarian",
        "cities": [
            "Budapest",
            "Debrecen",
            "Szeged",
            "Miskolc",
            "Pecs"
        ]
    },
    {
        "name": "Iceland",
        "code": "IS",
        "dialCode": "+354",
        "nationality": "Icelander",
        "cities": [
            "Reykjavik",
            "Kopavogur",
            "Hafnarfjordur",
            "Akureyri"
        ]
    },
    {
        "name": "Iran",
        "code": "IR",
        "dialCode": "+98",
        "nationality": "Iranian",
        "cities": [
            "Tehran",
            "Mashhad",
            "Isfahan",
            "Shiraz",
            "Tabriz"
        ]
    },
    {
        "name": "Iraq",
        "code": "IQ",
        "dialCode": "+964",
        "nationality": "Iraqi",
        "cities": [
            "Baghdad",
            "Basra",
            "Erbil",
            "Mosul",
            "Sulaymaniyah"
        ]
    },
    {
        "name": "Israel",
        "code": "IL",
        "dialCode": "+972",
        "nationality": "Israeli",
        "cities": [
            "Jerusalem",
            "Tel Aviv",
            "Haifa",
            "Rishon LeZion",
            "Eilat"
        ]
    },
    {
        "name": "Ivory Coast",
        "code": "CI",
        "dialCode": "+225",
        "nationality": "Ivorian",
        "cities": [
            "Yamoussoukro",
            "Abidjan",
            "Bouake",
            "San Pedro"
        ]
    },
    {
        "name": "Jamaica",
        "code": "JM",
        "dialCode": "+1876",
        "nationality": "Jamaican",
        "cities": [
            "Kingston",
            "Montego Bay",
            "Ocho Rios",
            "Negril"
        ]
    },
    {
        "name": "Jordan",
        "code": "JO",
        "dialCode": "+962",
        "nationality": "Jordanian",
        "cities": [
            "Amman",
            "Zarqa",
            "Irbid",
            "Aqaba",
            "Petra"
        ]
    },
    {
        "name": "Kazakhstan",
        "code": "KZ",
        "dialCode": "+7",
        "nationality": "Kazakhstani",
        "cities": [
            "Astana",
            "Almaty",
            "Shymkent",
            "Karaganda"
        ]
    },
    {
        "name": "Kenya",
        "code": "KE",
        "dialCode": "+254",
        "nationality": "Kenyan",
        "cities": [
            "Nairobi",
            "Mombasa",
            "Kisumu",
            "Nakuru",
            "Eldoret"
        ]
    },
    {
        "name": "Kiribati",
        "code": "KI",
        "dialCode": "+686",
        "nationality": "I-Kiribati",
        "cities": [
            "South Tarawa",
            "Betio",
            "Bikenibeu"
        ]
    },
    {
        "name": "Kosovo",
        "code": "XK",
        "dialCode": "+383",
        "nationality": "Kosovar",
        "cities": [
            "Pristina",
            "Prizren",
            "Peja",
            "Mitrovica"
        ]
    },
    {
        "name": "Kyrgyzstan",
        "code": "KG",
        "dialCode": "+996",
        "nationality": "Kyrgyzstani",
        "cities": [
            "Bishkek",
            "Osh",
            "Jalal-Abad",
            "Karakol"
        ]
    },
    {
        "name": "Laos",
        "code": "LA",
        "dialCode": "+856",
        "nationality": "Laotian",
        "cities": [
            "Vientiane",
            "Luang Prabang",
            "Pakse",
            "Savannakhet"
        ]
    },
    {
        "name": "Latvia",
        "code": "LV",
        "dialCode": "+371",
        "nationality": "Latvian",
        "cities": [
            "Riga",
            "Daugavpils",
            "Liepaja",
            "Jelgava",
            "Jurmala"
        ]
    },
    {
        "name": "Lebanon",
        "code": "LB",
        "dialCode": "+961",
        "nationality": "Lebanese",
        "cities": [
            "Beirut",
            "Tripoli",
            "Sidon",
            "Tyre",
            "Byblos"
        ]
    },
    {
        "name": "Lesotho",
        "code": "LS",
        "dialCode": "+266",
        "nationality": "Basotho",
        "cities": [
            "Maseru",
            "Teyateyaneng",
            "Mafeteng"
        ]
    },
    {
        "name": "Liberia",
        "code": "LR",
        "dialCode": "+231",
        "nationality": "Liberian",
        "cities": [
            "Monrovia",
            "Gbarnga",
            "Buchanan",
            "Kakata"
        ]
    },
    {
        "name": "Libya",
        "code": "LY",
        "dialCode": "+218",
        "nationality": "Libyan",
        "cities": [
            "Tripoli",
            "Benghazi",
            "Misrata",
            "Bayda"
        ]
    },
    {
        "name": "Liechtenstein",
        "code": "LI",
        "dialCode": "+423",
        "nationality": "Liechtensteiner",
        "cities": [
            "Vaduz",
            "Schaan",
            "Balzers",
            "Triesen"
        ]
    },
    {
        "name": "Lithuania",
        "code": "LT",
        "dialCode": "+370",
        "nationality": "Lithuanian",
        "cities": [
            "Vilnius",
            "Kaunas",
            "Klaipeda",
            "Siauliai"
        ]
    },
    {
        "name": "Luxembourg",
        "code": "LU",
        "dialCode": "+352",
        "nationality": "Luxembourgish",
        "cities": [
            "Luxembourg City",
            "Esch-sur-Alzette",
            "Differdange"
        ]
    },
    {
        "name": "Madagascar",
        "code": "MG",
        "dialCode": "+261",
        "nationality": "Malagasy",
        "cities": [
            "Antananarivo",
            "Toamasina",
            "Antsirabe",
            "Mahajanga"
        ]
    },
    {
        "name": "Malawi",
        "code": "MW",
        "dialCode": "+265",
        "nationality": "Malawian",
        "cities": [
            "Lilongwe",
            "Blantyre",
            "Mzuzu",
            "Zomba"
        ]
    },
    {
        "name": "Mali",
        "code": "ML",
        "dialCode": "+223",
        "nationality": "Malian",
        "cities": [
            "Bamako",
            "Sikasso",
            "Mopti",
            "Timbuktu"
        ]
    },
    {
        "name": "Malta",
        "code": "MT",
        "dialCode": "+356",
        "nationality": "Maltese",
        "cities": [
            "Valletta",
            "Birkirkara",
            "Sliema",
            "St. Julian's",
            "Mdina"
        ]
    },
    {
        "name": "Marshall Islands",
        "code": "MH",
        "dialCode": "+692",
        "nationality": "Marshallese",
        "cities": [
            "Majuro",
            "Ebeye",
            "Arno"
        ]
    },
    {
        "name": "Mauritania",
        "code": "MR",
        "dialCode": "+222",
        "nationality": "Mauritanian",
        "cities": [
            "Nouakchott",
            "Nouadhibou",
            "Kiffa"
        ]
    },
    {
        "name": "Mauritius",
        "code": "MU",
        "dialCode": "+230",
        "nationality": "Mauritian",
        "cities": [
            "Port Louis",
            "Beau Bassin",
            "Vacoas",
            "Curepipe"
        ]
    },
    {
        "name": "Micronesia",
        "code": "FM",
        "dialCode": "+691",
        "nationality": "Micronesian",
        "cities": [
            "Palikir",
            "Weno",
            "Kolonia"
        ]
    },
    {
        "name": "Moldova",
        "code": "MD",
        "dialCode": "+373",
        "nationality": "Moldovan",
        "cities": [
            "Chisinau",
            "Balti",
            "Tiraspol",
            "Bender"
        ]
    },
    {
        "name": "Monaco",
        "code": "MC",
        "dialCode": "+377",
        "nationality": "Monegasque",
        "cities": [
            "Monaco",
            "Monte Carlo",
            "La Condamine",
            "Fontvieille"
        ]
    },
    {
        "name": "Mongolia",
        "code": "MN",
        "dialCode": "+976",
        "nationality": "Mongolian",
        "cities": [
            "Ulaanbaatar",
            "Erdenet",
            "Darkhan"
        ]
    },
    {
        "name": "Montenegro",
        "code": "ME",
        "dialCode": "+382",
        "nationality": "Montenegrin",
        "cities": [
            "Podgorica",
            "Niksic",
            "Budva",
            "Kotor",
            "Herceg Novi"
        ]
    },
    {
        "name": "Morocco",
        "code": "MA",
        "dialCode": "+212",
        "nationality": "Moroccan",
        "cities": [
            "Rabat",
            "Casablanca",
            "Marrakech",
            "Fes",
            "Tangier",
            "Agadir"
        ]
    },
    {
        "name": "Mozambique",
        "code": "MZ",
        "dialCode": "+258",
        "nationality": "Mozambican",
        "cities": [
            "Maputo",
            "Matola",
            "Beira",
            "Nampula"
        ]
    },
    {
        "name": "Myanmar",
        "code": "MM",
        "dialCode": "+95",
        "nationality": "Burmese",
        "cities": [
            "Naypyidaw",
            "Yangon",
            "Mandalay",
            "Bagan",
            "Taunggyi"
        ]
    },
    {
        "name": "Namibia",
        "code": "NA",
        "dialCode": "+264",
        "nationality": "Namibian",
        "cities": [
            "Windhoek",
            "Walvis Bay",
            "Swakopmund",
            "Oshakati"
        ]
    },
    {
        "name": "Nauru",
        "code": "NR",
        "dialCode": "+674",
        "nationality": "Nauruan",
        "cities": [
            "Yaren",
            "Denigomodu",
            "Meneng"
        ]
    },
    {
        "name": "Nicaragua",
        "code": "NI",
        "dialCode": "+505",
        "nationality": "Nicaraguan",
        "cities": [
            "Managua",
            "Leon",
            "Granada",
            "Matagalpa"
        ]
    },
    {
        "name": "Niger",
        "code": "NE",
        "dialCode": "+227",
        "nationality": "Nigerien",
        "cities": [
            "Niamey",
            "Maradi",
            "Zinder",
            "Tahoua"
        ]
    },
    {
        "name": "Nigeria",
        "code": "NG",
        "dialCode": "+234",
        "nationality": "Nigerian",
        "cities": [
            "Abuja",
            "Lagos",
            "Kano",
            "Ibadan",
            "Port Harcourt"
        ]
    },
    {
        "name": "North Korea",
        "code": "KP",
        "dialCode": "+850",
        "nationality": "North Korean",
        "cities": [
            "Pyongyang",
            "Hamhung",
            "Chongjin",
            "Nampo"
        ]
    },
    {
        "name": "North Macedonia",
        "code": "MK",
        "dialCode": "+389",
        "nationality": "Macedonian",
        "cities": [
            "Skopje",
            "Bitola",
            "Kumanovo",
            "Ohrid"
        ]
    },
    {
        "name": "Palau",
        "code": "PW",
        "dialCode": "+680",
        "nationality": "Palauan",
        "cities": [
            "Ngerulmud",
            "Koror",
            "Airai"
        ]
    },
    {
        "name": "Palestine",
        "code": "PS",
        "dialCode": "+970",
        "nationality": "Palestinian",
        "cities": [
            "Ramallah",
            "Gaza City",
            "East Jerusalem",
            "Hebron",
            "Nablus",
            "Bethlehem"
        ]
    },
    {
        "name": "Panama",
        "code": "PA",
        "dialCode": "+507",
        "nationality": "Panamanian",
        "cities": [
            "Panama City",
            "Colon",
            "David",
            "Santiago"
        ]
    },
    {
        "name": "Papua New Guinea",
        "code": "PG",
        "dialCode": "+675",
        "nationality": "Papua New Guinean",
        "cities": [
            "Port Moresby",
            "Lae",
            "Arawa",
            "Mount Hagen"
        ]
    },
    {
        "name": "Paraguay",
        "code": "PY",
        "dialCode": "+595",
        "nationality": "Paraguayan",
        "cities": [
            "Asuncion",
            "Ciudad del Este",
            "San Lorenzo",
            "Luque"
        ]
    },
    {
        "name": "Peru",
        "code": "PE",
        "dialCode": "+51",
        "nationality": "Peruvian",
        "cities": [
            "Lima",
            "Arequipa",
            "Trujillo",
            "Cusco",
            "Chiclayo"
        ]
    },
    {
        "name": "Romania",
        "code": "RO",
        "dialCode": "+40",
        "nationality": "Romanian",
        "cities": [
            "Bucharest",
            "Cluj-Napoca",
            "Timisoara",
            "Iasi",
            "Constanta",
            "Brasov"
        ]
    },
    {
        "name": "Rwanda",
        "code": "RW",
        "dialCode": "+250",
        "nationality": "Rwandan",
        "cities": [
            "Kigali",
            "Butare",
            "Gisenyi",
            "Ruhengeri"
        ]
    },
    {
        "name": "Saint Kitts and Nevis",
        "code": "KN",
        "dialCode": "+1869",
        "nationality": "Kittitian",
        "cities": [
            "Basseterre",
            "Charlestown",
            "Sandy Point"
        ]
    },
    {
        "name": "Saint Lucia",
        "code": "LC",
        "dialCode": "+1758",
        "nationality": "Saint Lucian",
        "cities": [
            "Castries",
            "Vieux Fort",
            "Gros Islet"
        ]
    },
    {
        "name": "Saint Vincent and the Grenadines",
        "code": "VC",
        "dialCode": "+1784",
        "nationality": "Vincentian",
        "cities": [
            "Kingstown",
            "Georgetown",
            "Barrouallie"
        ]
    },
    {
        "name": "Samoa",
        "code": "WS",
        "dialCode": "+685",
        "nationality": "Samoan",
        "cities": [
            "Apia",
            "Vaitele",
            "Faleasiu"
        ]
    },
    {
        "name": "San Marino",
        "code": "SM",
        "dialCode": "+378",
        "nationality": "Sammarinese",
        "cities": [
            "San Marino",
            "Serravalle",
            "Borgo Maggiore"
        ]
    },
    {
        "name": "Sao Tome and Principe",
        "code": "ST",
        "dialCode": "+239",
        "nationality": "Sao Tomean",
        "cities": [
            "Sao Tome",
            "Trindade",
            "Santana"
        ]
    },
    {
        "name": "Senegal",
        "code": "SN",
        "dialCode": "+221",
        "nationality": "Senegalese",
        "cities": [
            "Dakar",
            "Thies",
            "Kaolack",
            "Saint-Louis"
        ]
    },
    {
        "name": "Serbia",
        "code": "RS",
        "dialCode": "+381",
        "nationality": "Serbian",
        "cities": [
            "Belgrade",
            "Novi Sad",
            "Nis",
            "Kragujevac",
            "Subotica"
        ]
    },
    {
        "name": "Seychelles",
        "code": "SC",
        "dialCode": "+248",
        "nationality": "Seychellois",
        "cities": [
            "Victoria",
            "Anse Boileau",
            "Beau Vallon"
        ]
    },
    {
        "name": "Sierra Leone",
        "code": "SL",
        "dialCode": "+232",
        "nationality": "Sierra Leonean",
        "cities": [
            "Freetown",
            "Bo",
            "Kenema",
            "Makeni"
        ]
    },
    {
        "name": "Slovakia",
        "code": "SK",
        "dialCode": "+421",
        "nationality": "Slovak",
        "cities": [
            "Bratislava",
            "Kosice",
            "Presov",
            "Zilina",
            "Banska Bystrica"
        ]
    },
    {
        "name": "Slovenia",
        "code": "SI",
        "dialCode": "+386",
        "nationality": "Slovenian",
        "cities": [
            "Ljubljana",
            "Maribor",
            "Kranj",
            "Koper",
            "Bled"
        ]
    },
    {
        "name": "Solomon Islands",
        "code": "SB",
        "dialCode": "+677",
        "nationality": "Solomon Islander",
        "cities": [
            "Honiara",
            "Gizo",
            "Auki"
        ]
    },
    {
        "name": "Somalia",
        "code": "SO",
        "dialCode": "+252",
        "nationality": "Somali",
        "cities": [
            "Mogadishu",
            "Hargeisa",
            "Kismayo",
            "Bosaso"
        ]
    },
    {
        "name": "South Sudan",
        "code": "SS",
        "dialCode": "+211",
        "nationality": "South Sudanese",
        "cities": [
            "Juba",
            "Malakal",
            "Wau",
            "Yei"
        ]
    },
    {
        "name": "Sudan",
        "code": "SD",
        "dialCode": "+249",
        "nationality": "Sudanese",
        "cities": [
            "Khartoum",
            "Omdurman",
            "Port Sudan",
            "Kassala"
        ]
    },
    {
        "name": "Suriname",
        "code": "SR",
        "dialCode": "+597",
        "nationality": "Surinamese",
        "cities": [
            "Paramaribo",
            "Lelydorp",
            "Nieuw Nickerie"
        ]
    },
    {
        "name": "Syria",
        "code": "SY",
        "dialCode": "+963",
        "nationality": "Syrian",
        "cities": [
            "Damascus",
            "Aleppo",
            "Homs",
            "Latakia"
        ]
    },
    {
        "name": "Taiwan",
        "code": "TW",
        "dialCode": "+886",
        "nationality": "Taiwanese",
        "cities": [
            "Taipei",
            "Kaohsiung",
            "Taichung",
            "Tainan",
            "Hsinchu"
        ]
    },
    {
        "name": "Tajikistan",
        "code": "TJ",
        "dialCode": "+992",
        "nationality": "Tajik",
        "cities": [
            "Dushanbe",
            "Khujand",
            "Bokhtar",
            "Kulob"
        ]
    },
    {
        "name": "Tanzania",
        "code": "TZ",
        "dialCode": "+255",
        "nationality": "Tanzanian",
        "cities": [
            "Dodoma",
            "Dar es Salaam",
            "Arusha",
            "Mwanza",
            "Zanzibar City"
        ]
    },
    {
        "name": "Timor-Leste",
        "code": "TL",
        "dialCode": "+670",
        "nationality": "Timorese",
        "cities": [
            "Dili",
            "Baucau",
            "Maliana"
        ]
    },
    {
        "name": "Togo",
        "code": "TG",
        "dialCode": "+228",
        "nationality": "Togolese",
        "cities": [
            "Lome",
            "Sokode",
            "Kara",
            "Kpalime"
        ]
    },
    {
        "name": "Tonga",
        "code": "TO",
        "dialCode": "+676",
        "nationality": "Tongan",
        "cities": [
            "Nuku'alofa",
            "Neiafu",
            "Haveluloto"
        ]
    },
    {
        "name": "Trinidad and Tobago",
        "code": "TT",
        "dialCode": "+1868",
        "nationality": "Trinidadian",
        "cities": [
            "Port of Spain",
            "San Fernando",
            "Chaguanas",
            "Arima"
        ]
    },
    {
        "name": "Tunisia",
        "code": "TN",
        "dialCode": "+216",
        "nationality": "Tunisian",
        "cities": [
            "Tunis",
            "Sfax",
            "Sousse",
            "Kairouan",
            "Bizerte"
        ]
    },
    {
        "name": "Turkmenistan",
        "code": "TM",
        "dialCode": "+993",
        "nationality": "Turkmen",
        "cities": [
            "Ashgabat",
            "Turkmenabat",
            "Dasoguz",
            "Mary"
        ]
    },
    {
        "name": "Tuvalu",
        "code": "TV",
        "dialCode": "+688",
        "nationality": "Tuvaluan",
        "cities": [
            "Funafuti",
            "Asau",
            "Alapi"
        ]
    },
    {
        "name": "Uganda",
        "code": "UG",
        "dialCode": "+256",
        "nationality": "Ugandan",
        "cities": [
            "Kampala",
            "Entebbe",
            "Gulu",
            "Jinja",
            "Mbarara"
        ]
    },
    {
        "name": "Ukraine",
        "code": "UA",
        "dialCode": "+380",
        "nationality": "Ukrainian",
        "cities": [
            "Kyiv",
            "Kharkiv",
            "Odesa",
            "Dnipro",
            "Lviv"
        ]
    },
    {
        "name": "Uruguay",
        "code": "UY",
        "dialCode": "+598",
        "nationality": "Uruguayan",
        "cities": [
            "Montevideo",
            "Salto",
            "Ciudad de la Costa",
            "Punta del Este"
        ]
    },
    {
        "name": "Uzbekistan",
        "code": "UZ",
        "dialCode": "+998",
        "nationality": "Uzbek",
        "cities": [
            "Tashkent",
            "Samarkand",
            "Bukhara",
            "Namangan",
            "Andijan"
        ]
    },
    {
        "name": "Vanuatu",
        "code": "VU",
        "dialCode": "+678",
        "nationality": "Ni-Vanuatu",
        "cities": [
            "Port Vila",
            "Luganville",
            "Norsup"
        ]
    },
    {
        "name": "Vatican City",
        "code": "VA",
        "dialCode": "+379",
        "nationality": "Vatican",
        "cities": [
            "Vatican City"
        ]
    },
    {
        "name": "Venezuela",
        "code": "VE",
        "dialCode": "+58",
        "nationality": "Venezuelan",
        "cities": [
            "Caracas",
            "Maracaibo",
            "Valencia",
            "Barquisimeto"
        ]
    },
    {
        "name": "Yemen",
        "code": "YE",
        "dialCode": "+967",
        "nationality": "Yemeni",
        "cities": [
            "Sana'a",
            "Aden",
            "Taiz",
            "Al Hudaydah"
        ]
    },
    {
        "name": "Zambia",
        "code": "ZM",
        "dialCode": "+260",
        "nationality": "Zambian",
        "cities": [
            "Lusaka",
            "Kitwe",
            "Ndola",
            "Livingstone"
        ]
    },
    {
        "name": "Zimbabwe",
        "code": "ZW",
        "dialCode": "+263",
        "nationality": "Zimbabwean",
        "cities": [
            "Harare",
            "Bulawayo",
            "Chitungwiza",
            "Mutare",
            "Victoria Falls"
        ]
    }
];

export function getCountryByName(name: string): CountryInfo | undefined {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    return COUNTRIES_DATABASE.find(c =>
        c.name.toLowerCase() === clean ||
        c.nationality.toLowerCase() === clean ||
        c.code.toLowerCase() === clean
    );
}

export function getCitiesForCountry(countryName: string): string[] {
    const country = getCountryByName(countryName);
    return country && country.cities && country.cities.length > 0
        ? country.cities
        : ['Capital City', 'Central District', 'Downtown', 'Other'];
}

export function getDialCodeForCountry(countryName: string): string {
    const country = getCountryByName(countryName);
    return country ? country.dialCode : '+880';
}

export function getNationalityForCountry(countryName: string): string {
    const country = getCountryByName(countryName);
    return country ? country.nationality : 'Bangladeshi';
}
