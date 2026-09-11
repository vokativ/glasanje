/**
 * CANONICAL DIPLOMATIC MISSIONS DATASET
 * Generated from verified MFA Serbia official records (mfa.gov.rs).
 * Date: 2026-09-09
 */

export interface PollingStation {
  id: string;
  embassy: string;
  embassyCyr: string;
  email: string;
  isElectionContactConfirmed: boolean;
  website: string;
  address: string;
  isResident: boolean;
}

export interface VotingCountry {
  countryCode: string;
  label: string;
  labelCyr: string;
  aliases?: string[];
  stations: PollingStation[];
}

export const COUNTRIES: VotingCountry[] = [
  {
    "countryCode": "AF",
    "label": "Avganistan",
    "labelCyr": "Авганистан",
    "stations": [
      {
        "id": "st-nonres-af",
        "embassy": "Ambasada Republike Srbije (Iran) (pokriva Avganistan)",
        "embassyCyr": "Амбасада Републике Србије (Иран) (покрива Авганистан)",
        "email": "konzularno@serbiatehran.com",
        "isElectionContactConfirmed": false,
        "website": "https://tehran.mfa.gov.rs",
        "address": "No. 3, 4th Alley, North Mohammad Reza Shajarian St.,Shahrak e Qods (Gharb), Tehran, IRAN",
        "isResident": false
      }
    ],
    "aliases": [
      "Avganistan",
      "Авганистан"
    ]
  },
  {
    "countryCode": "AZ",
    "label": "Azerbejdžan",
    "labelCyr": "Азербејџан",
    "stations": [
      {
        "id": "st-az-emb-main",
        "embassy": "Ambasada Republike Srbije (Azerbejdžan)",
        "embassyCyr": "Амбасада Републике Србије (Азербејџан)",
        "email": "serbianembassy.baku@azeurotel.comserbianembassy.consular.baku",
        "isElectionContactConfirmed": false,
        "website": "https://baku.mfa.gov.rs",
        "address": "Farid Aliyev, 6,IcherisheherAZ 1095БАКУАЗЕРБЕЈЏАН",
        "isResident": true
      }
    ],
    "aliases": [
      "Azerbejdžan",
      "Азербејџан"
    ]
  },
  {
    "countryCode": "AL",
    "label": "Albanija",
    "labelCyr": "Албанија",
    "stations": [
      {
        "id": "st-al-emb-main",
        "embassy": "Ambasada Republike Srbije (Albanija)",
        "embassyCyr": "Амбасада Републике Србије (Албанија)",
        "email": "srb.emb.albania@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://tirana.mfa.gov.rs",
        "address": "Rr. Donika Kastrioti 9/1 ТИРАНА АЛБАНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Albanija",
      "Албанија"
    ]
  },
  {
    "countryCode": "DZ",
    "label": "Alžir",
    "labelCyr": "Алжир",
    "stations": [
      {
        "id": "st-dz-emb-main",
        "embassy": "Ambasada Republike Srbije (Alžir)",
        "embassyCyr": "Амбасада Републике Србије (Алжир)",
        "email": "consulat@ambserbie-alger.com",
        "isElectionContactConfirmed": true,
        "website": "https://alger.mfa.gov.rs",
        "address": "42, rue des Frères Benali Abdellah (ex rue Parmentier)B.P.366, HYDRAАЛЖИР",
        "isResident": true
      }
    ],
    "aliases": [
      "Alžir",
      "Алжир"
    ]
  },
  {
    "countryCode": "AO",
    "label": "Angola",
    "labelCyr": "Ангола",
    "stations": [
      {
        "id": "st-ao-emb-main",
        "embassy": "Ambasada Republike Srbije (Angola)",
        "embassyCyr": "Амбасада Републике Србије (Ангола)",
        "email": "srb.emb.angola@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://luanda.mfa.gov.rs",
        "address": "Comandante N'Zaji 25/27, AlvaladeЛУАНДААНГОЛА",
        "isResident": true
      }
    ],
    "aliases": [
      "Angola",
      "Ангола"
    ]
  },
  {
    "countryCode": "AD",
    "label": "Andora",
    "labelCyr": "Андора",
    "stations": [
      {
        "id": "st-nonres-ad",
        "embassy": "Ambasada Republike Srbije (Španija) (pokriva Andora)",
        "embassyCyr": "Амбасада Републике Србије (Шпанија) (покрива Андора)",
        "email": "konz.madrid@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://madrid.mfa.gov.rs",
        "address": "c/Velazquez 3, Piso 228001 МАДРИДШПАНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Andora",
      "Андора"
    ]
  },
  {
    "countryCode": "AG",
    "label": "Antigva i Barbuda",
    "labelCyr": "Антигва и Барбуда",
    "stations": [
      {
        "id": "st-nonres-ag",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Antigva i Barbuda)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Антигва и Барбуда)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Antigva i Barbuda",
      "Антигва и Барбуда"
    ]
  },
  {
    "countryCode": "AR",
    "label": "Argentina",
    "labelCyr": "Аргентина",
    "stations": [
      {
        "id": "st-ar-emb-main",
        "embassy": "Ambasada Republike Srbije (Argentina)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": true
      }
    ],
    "aliases": [
      "Argentina",
      "Аргентина"
    ]
  },
  {
    "countryCode": "AU",
    "label": "Australija",
    "labelCyr": "Аустралија",
    "stations": [
      {
        "id": "st-au-emb-main",
        "embassy": "Ambasada Republike Srbije (Australija)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": true
      },
      {
        "id": "st-au-cons-sidnej",
        "embassy": "Generalni konzulat Republike Srbije (Sidnej)",
        "embassyCyr": "Генерални конзулат Републике Србије (Сиднеј)",
        "email": "srb.cons.sydney@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.sydney.mfa.gov.rs",
        "address": "12, Trelawney Street, Woollahra, N.S.W.2025 P.O.Box 190 Edgecliff, N.S.W.2027 СИДНЕЈ АУСТРАЛИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Australija",
      "Аустралија"
    ]
  },
  {
    "countryCode": "AT",
    "label": "Austrija",
    "labelCyr": "Аустрија",
    "stations": [
      {
        "id": "st-at-emb-main",
        "embassy": "Ambasada Republike Srbije (Austrija)",
        "embassyCyr": "Амбасада Републике Србије (Аустрија)",
        "email": "consulate.vienna@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://vienna.mfa.gov.rs",
        "address": "Ölzeltgasse 31030 БЕЧАУСТРИЈА",
        "isResident": true
      },
      {
        "id": "st-at-cons-salcburg",
        "embassy": "Generalni konzulat Republike Srbije (Salcburg)",
        "embassyCyr": "Генерални конзулат Републике Србије (Салцбург)",
        "email": "genconsulate.salzburg@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.salzburg.mfa.gov.rs",
        "address": "Schallmooser Hauptstrasse 99 5020 САЛЦБУРГ АУСТРИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Austrija",
      "Аустрија"
    ]
  },
  {
    "countryCode": "BD",
    "label": "Bangladeš",
    "labelCyr": "Бангладеш",
    "stations": [
      {
        "id": "st-nonres-bd",
        "embassy": "Ambasada Republike Srbije (Indija) (pokriva Bangladeš)",
        "embassyCyr": "Амбасада Републике Србије (Индија) (покрива Бангладеш)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Bangladeš",
      "Бангладеш"
    ]
  },
  {
    "countryCode": "BB",
    "label": "Barbados",
    "labelCyr": "Барбадос",
    "stations": [
      {
        "id": "st-nonres-bb",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Barbados)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Барбадос)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Barbados",
      "Барбадос"
    ]
  },
  {
    "countryCode": "BS",
    "label": "Bahami",
    "labelCyr": "Бахами",
    "stations": [
      {
        "id": "st-nonres-bs",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Bahami)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Бахами)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Bahami",
      "Бахами"
    ]
  },
  {
    "countryCode": "BH",
    "label": "Bahrein",
    "labelCyr": "Бахреин",
    "stations": [
      {
        "id": "st-bh-emb-main",
        "embassy": "Ambasada Republike Srbije (Bahrein)",
        "embassyCyr": "Амбасада Републике Србије (Бахреин)",
        "email": "serbia.consular.bahrain@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "BLD 899ROAD 3218Manama/Buashirah 332Kingdom of Bahrain",
        "isResident": true
      }
    ],
    "aliases": [
      "Bahrein",
      "Бахреин"
    ]
  },
  {
    "countryCode": "BE",
    "label": "Belgija",
    "labelCyr": "Белгија",
    "stations": [
      {
        "id": "st-be-emb-main",
        "embassy": "Ambasada Republike Srbije (Belgija)",
        "embassyCyr": "Амбасада Републике Србије (Белгија)",
        "email": "konzularno.brisel@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://brussels.mfa.gov.rs",
        "address": "Boulevard Du Regent 531000 БРИСЕЛБЕЛГИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Belgija",
      "Белгија"
    ]
  },
  {
    "countryCode": "BZ",
    "label": "Belize",
    "labelCyr": "Белизе",
    "stations": [
      {
        "id": "st-nonres-bz",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Belize)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Белизе)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Belize",
      "Белизе"
    ]
  },
  {
    "countryCode": "BY",
    "label": "Belorusija",
    "labelCyr": "Белорусија",
    "stations": [
      {
        "id": "st-by-emb-main",
        "embassy": "Ambasada Republike Srbije (Belorusija)",
        "embassyCyr": "Амбасада Републике Србије (Белорусија)",
        "email": "embassy.minsk@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://minsk.mfa.gov.rs",
        "address": "Rumjanceva 4220034 МИНСКРЕПУБЛИКА БЕЛОРУСИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Belorusija",
      "Белорусија"
    ]
  },
  {
    "countryCode": "BJ",
    "label": "Benin",
    "labelCyr": "Бенин",
    "stations": [
      {
        "id": "st-nonres-bj",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Benin)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Бенин)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Benin",
      "Бенин"
    ]
  },
  {
    "countryCode": "BO",
    "label": "Bolivija",
    "labelCyr": "Боливија",
    "stations": [
      {
        "id": "st-nonres-bo",
        "embassy": "Ambasada Republike Srbije (Argentina) (pokriva Bolivija)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина) (покрива Боливија)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": false
      }
    ],
    "aliases": [
      "Bolivija",
      "Боливија"
    ]
  },
  {
    "countryCode": "BA",
    "label": "Bosna i Hercegovina",
    "labelCyr": "Босна и Херцеговина",
    "stations": [
      {
        "id": "st-ba-emb-main",
        "embassy": "Ambasada Republike Srbije (Bosna i Hercegovina)",
        "embassyCyr": "Амбасада Републике Србије (Босна и Херцеговина)",
        "email": "ambasada.sarajevo@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://sarajevo.mfa.gov.rs",
        "address": "Обала Мака Диздара 3aСАРАЈЕВОБОСНА И ХЕРЦЕГОВИНА",
        "isResident": true
      },
      {
        "id": "st-ba-cons-trebinje",
        "embassy": "Generalni konzulat Republike Srbije (Trebinje)",
        "embassyCyr": "Генерални конзулат Републике Србије (Требиње)",
        "email": "kk.trebinje@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://banjaluka.mfa.gov.rs",
        "address": "Његошева 489101 ТребињеБОСНА И ХЕРЦЕГОВИНА",
        "isResident": true
      },
      {
        "id": "st-ba-cons-drvar",
        "embassy": "Generalni konzulat Republike Srbije (Drvar)",
        "embassyCyr": "Генерални конзулат Републике Србије (Дрвар)",
        "email": "kk.rs-drvar@teol.net",
        "isElectionContactConfirmed": false,
        "website": "https://mostar.mfa.gov.rs",
        "address": "Титова бб80260 ДрварБОСНА И ХЕРЦЕГОВИНА",
        "isResident": true
      },
      {
        "id": "st-ba-cons-mostar",
        "embassy": "Generalni konzulat Republike Srbije (Mostar)",
        "embassyCyr": "Генерални конзулат Републике Србије (Мостар)",
        "email": "gk.mostar@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://mostar.mfa.gov.rs",
        "address": "Ulica Konak br.588000 МОСТАРБОСНА И ХЕРЦЕГОВИНА",
        "isResident": true
      },
      {
        "id": "st-ba-cons-banjaluka",
        "embassy": "Generalni konzulat Republike Srbije (Banja Luka)",
        "embassyCyr": "Генерални конзулат Републике Србије (Бања Лука)",
        "email": "konzulat.bl@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.banjaluka.mfa.gov.rs",
        "address": "Војводе Радомира Путника 2 78000 БАЊАЛУКА БОСНА И ХЕРЦЕГОВИНА",
        "isResident": true
      }
    ],
    "aliases": [
      "Bosna i Hercegovina",
      "Босна и Херцеговина"
    ]
  },
  {
    "countryCode": "BW",
    "label": "Bocvana",
    "labelCyr": "Боцвана",
    "stations": [
      {
        "id": "st-nonres-bw",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Bocvana)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Боцвана)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Bocvana",
      "Боцвана"
    ]
  },
  {
    "countryCode": "BR",
    "label": "Brazil",
    "labelCyr": "Бразил",
    "stations": [
      {
        "id": "st-br-emb-main",
        "embassy": "Ambasada Republike Srbije (Brazil)",
        "embassyCyr": "Амбасада Републике Србије (Бразил)",
        "email": "embaixadaservia@terra.com.br",
        "isElectionContactConfirmed": false,
        "website": "https://brasilia.mfa.gov.rs",
        "address": "SES Avenida das Nacoes, Qd. 803, Lote 15CEP 70409-900 БРАЗИЛИЈАБРАЗИЛ",
        "isResident": true
      }
    ],
    "aliases": [
      "Brazil",
      "Бразил"
    ]
  },
  {
    "countryCode": "BN",
    "label": "Brunej Darusalam",
    "labelCyr": "Брунеј Дарусалам",
    "stations": [
      {
        "id": "st-nonres-bn",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Brunej Darusalam)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Брунеј Дарусалам)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Brunej Darusalam",
      "Брунеј Дарусалам"
    ]
  },
  {
    "countryCode": "BG",
    "label": "Bugarska",
    "labelCyr": "Бугарска",
    "stations": [
      {
        "id": "st-bg-emb-main",
        "embassy": "Ambasada Republike Srbije (Bugarska)",
        "embassyCyr": "Амбасада Републике Србије (Бугарска)",
        "email": "srb.emb.bulgaria@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://sofia.mfa.gov.rs",
        "address": "Veliko Trnovo 31504 СОФИЈАБУГАРСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Bugarska",
      "Бугарска"
    ]
  },
  {
    "countryCode": "BF",
    "label": "Burkina Faso",
    "labelCyr": "Буркина Фасо",
    "stations": [
      {
        "id": "st-nonres-bf",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Burkina Faso)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Буркина Фасо)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Burkina Faso",
      "Буркина Фасо"
    ]
  },
  {
    "countryCode": "BI",
    "label": "Burundi",
    "labelCyr": "Бурунди",
    "stations": [
      {
        "id": "st-nonres-bi",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Burundi)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Бурунди)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Burundi",
      "Бурунди"
    ]
  },
  {
    "countryCode": "BT",
    "label": "Butan",
    "labelCyr": "Бутан",
    "stations": [
      {
        "id": "st-nonres-bt",
        "embassy": "Ambasada Republike Srbije (Indija) (pokriva Butan)",
        "embassyCyr": "Амбасада Републике Србије (Индија) (покрива Бутан)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Butan",
      "Бутан"
    ]
  },
  {
    "countryCode": "VU",
    "label": "Vanuatu",
    "labelCyr": "Вануату",
    "stations": [
      {
        "id": "st-nonres-vu",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Vanuatu)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Вануату)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Vanuatu",
      "Вануату"
    ]
  },
  {
    "countryCode": "VA",
    "label": "Vatikan",
    "labelCyr": "Ватикан (Света Столица)",
    "stations": [
      {
        "id": "st-va-emb-main",
        "embassy": "Ambasada Republike Srbije (Vatikan)",
        "embassyCyr": "Амбасада Републике Србије (Ватикан (Света Столица))",
        "email": "amb.serbia.vatican@ambroma.com",
        "isElectionContactConfirmed": false,
        "website": "https://vatican.mfa.gov.rs",
        "address": "Via dei Monti Parioli 2000197 РИМВАТИКАН",
        "isResident": true
      }
    ],
    "aliases": [
      "Vatikan",
      "Vatikan (Sveta Stolica)",
      "Ватикан (Света Столица)"
    ]
  },
  {
    "countryCode": "VE",
    "label": "Venecuela",
    "labelCyr": "Венецуела",
    "stations": [
      {
        "id": "st-ve-emb-main",
        "embassy": "Ambasada Republike Srbije (Venecuela)",
        "embassyCyr": "Амбасада Републике Србије (Венецуела)",
        "email": "srb.emb.venezuela@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "Зграда Парке Кристал (Parque Cristal), Источна кула (Torre Este), 6. спрат Авенија Франсиска Миранда (Avenida Francisco Miranda) Лос Палос Грандес (Los Palos Grandes) Каракас Венецуела",
        "isResident": true
      }
    ],
    "aliases": [
      "Venecuela",
      "Венецуела"
    ]
  },
  {
    "countryCode": "VN",
    "label": "Vijetnam",
    "labelCyr": "Вијетнам",
    "stations": [
      {
        "id": "st-nonres-vn",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Vijetnam)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Вијетнам)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Vijetnam",
      "Вијетнам"
    ]
  },
  {
    "countryCode": "GA",
    "label": "Gabon",
    "labelCyr": "Габон",
    "stations": [
      {
        "id": "st-nonres-ga",
        "embassy": "Ambasada Republike Srbije (Angola) (pokriva Gabon)",
        "embassyCyr": "Амбасада Републике Србије (Ангола) (покрива Габон)",
        "email": "srb.emb.angola@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://luanda.mfa.gov.rs",
        "address": "Comandante N'Zaji 25/27, AlvaladeЛУАНДААНГОЛА",
        "isResident": false
      }
    ],
    "aliases": [
      "Gabon",
      "Габон"
    ]
  },
  {
    "countryCode": "GM",
    "label": "Gambija",
    "labelCyr": "Гамбија",
    "stations": [
      {
        "id": "st-nonres-gm",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Gambija)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Гамбија)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Gambija",
      "Гамбија"
    ]
  },
  {
    "countryCode": "GH",
    "label": "Gana",
    "labelCyr": "Гана",
    "stations": [
      {
        "id": "st-gh-emb-main",
        "embassy": "Ambasada Republike Srbije (Gana)",
        "embassyCyr": "Амбасада Републике Србије (Гана)",
        "email": "milutin.stanojevic@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "3 Dade Close, GL-043-8875, Labone, Accra, Ghana",
        "isResident": true
      }
    ],
    "aliases": [
      "Gana",
      "Гана"
    ]
  },
  {
    "countryCode": "GY",
    "label": "Gvajana",
    "labelCyr": "Гвајана",
    "stations": [
      {
        "id": "st-nonres-gy",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Gvajana)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Гвајана)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Gvajana",
      "Гвајана"
    ]
  },
  {
    "countryCode": "GT",
    "label": "Gvatemala",
    "labelCyr": "Гватемала",
    "stations": [
      {
        "id": "st-nonres-gt",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva Gvatemala)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Гватемала)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "Gvatemala",
      "Гватемала"
    ]
  },
  {
    "countryCode": "GN",
    "label": "Gvineja",
    "labelCyr": "Гвинеја",
    "stations": [
      {
        "id": "st-nonres-gn",
        "embassy": "Ambasada Republike Srbije (Alžir) (pokriva Gvineja)",
        "embassyCyr": "Амбасада Републике Србије (Алжир) (покрива Гвинеја)",
        "email": "ambasada@ambserbie-alger.com",
        "isElectionContactConfirmed": false,
        "website": "https://alger.mfa.gov.rs",
        "address": "42, rue des Frères Benali Abdellah (ex rue Parmentier)B.P.366, HYDRAАЛЖИР",
        "isResident": false
      }
    ],
    "aliases": [
      "Gvineja",
      "Гвинеја"
    ]
  },
  {
    "countryCode": "GW",
    "label": "Gvineja Bisao",
    "labelCyr": "Гвинеја Бисао",
    "stations": [
      {
        "id": "st-nonres-gw",
        "embassy": "Ambasada Republike Srbije (Alžir) (pokriva Gvineja Bisao)",
        "embassyCyr": "Амбасада Републике Србије (Алжир) (покрива Гвинеја Бисао)",
        "email": "consulat@ambserbie-alger.com",
        "isElectionContactConfirmed": true,
        "website": "https://alger.mfa.gov.rs",
        "address": "42, rue des Frères Benali Abdellah (ex rue Parmentier)B.P.366, HYDRAАЛЖИР",
        "isResident": false
      }
    ],
    "aliases": [
      "Gvineja Bisao",
      "Гвинеја Бисао"
    ]
  },
  {
    "countryCode": "GD",
    "label": "Grenada",
    "labelCyr": "Гренада",
    "stations": [
      {
        "id": "st-nonres-gd",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Grenada)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Гренада)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Grenada",
      "Гренада"
    ]
  },
  {
    "countryCode": "GE",
    "label": "Gruzija",
    "labelCyr": "Грузија",
    "stations": [
      {
        "id": "st-nonres-ge",
        "embassy": "Nadležno diplomatsko predstavništvo (pokriva Gruzija)",
        "embassyCyr": "Надлежно дипломатско представништво (покрива Грузија)",
        "email": "embserbia.yerevan@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "10 Vazgen Sargsyan St. 0010 Yerevan Piazza Grande Business Center, 1st floor, office 109",
        "isResident": false
      }
    ],
    "aliases": [
      "Gruzija",
      "Грузија"
    ]
  },
  {
    "countryCode": "GR",
    "label": "Grčka",
    "labelCyr": "Грчка",
    "stations": [
      {
        "id": "st-gr-emb-main",
        "embassy": "Ambasada Republike Srbije (Grčka)",
        "embassyCyr": "Амбасада Републике Србије (Грчка)",
        "email": "embassy.athens@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://athens.mfa.gov.rs",
        "address": "106, Vasilissis Sofias Ave.11527 АТИНАГРЧКА",
        "isResident": true
      },
      {
        "id": "st-gr-cons-solun",
        "embassy": "Generalni konzulat Republike Srbije (Solun)",
        "embassyCyr": "Генерални конзулат Републике Србије (Солун)",
        "email": "srbcons@otenet.gr",
        "isElectionContactConfirmed": false,
        "website": "https://www.thessaloniki.mfa.gov.rs",
        "address": "Komninon 454624 СОЛУНГРЧКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Grčka",
      "Грчка"
    ]
  },
  {
    "countryCode": "DK",
    "label": "Danska",
    "labelCyr": "Данска",
    "stations": [
      {
        "id": "st-dk-emb-main",
        "embassy": "Ambasada Republike Srbije (Danska)",
        "embassyCyr": "Амбасада Републике Србије (Данска)",
        "email": "serbianemb@city.dk",
        "isElectionContactConfirmed": false,
        "website": "https://copenhagen.mfa.gov.rs",
        "address": "Svanevænget 362100 КОПЕНХАГЕНДАНСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Danska",
      "Данска"
    ]
  },
  {
    "countryCode": "CD",
    "label": "Demokratska Republika Kongo",
    "labelCyr": "Демократска Република Конго",
    "stations": [
      {
        "id": "st-cd-emb-main",
        "embassy": "Ambasada Republike Srbije (Demokratska Republika Kongo)",
        "embassyCyr": "Амбасада Републике Србије (Демократска Република Конго)",
        "email": "serbambakin@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://kinshasa.mfa.gov.rs",
        "address": "Avenue de 1 Etoile 112,Gombe, КИНШАСА, КОНГО, ДР",
        "isResident": true
      }
    ],
    "aliases": [
      "Demokratska Republika Kongo",
      "Демократска Република Конго"
    ]
  },
  {
    "countryCode": "DM",
    "label": "Dominika",
    "labelCyr": "Доминика",
    "stations": [
      {
        "id": "st-nonres-dm",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Dominika)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Доминика)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Dominika",
      "Доминика"
    ]
  },
  {
    "countryCode": "DO",
    "label": "Dominikanska Republika",
    "labelCyr": "Доминиканска Република",
    "stations": [
      {
        "id": "st-nonres-do",
        "embassy": "Ambasada Republike Srbije (Kuba) (pokriva Dominikanska Republika)",
        "embassyCyr": "Амбасада Републике Србије (Куба) (покрива Доминиканска Република)",
        "email": "officesrbhav@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://havana.mfa.gov.rs",
        "address": "5ta Avenida, No. 4406, entre 44 y 46,Miramar Playa,ХАВАНА,КУБА",
        "isResident": false
      }
    ],
    "aliases": [
      "Dominikanska Republika",
      "Доминиканска Република"
    ]
  },
  {
    "countryCode": "EG",
    "label": "Egipat",
    "labelCyr": "Египат",
    "stations": [
      {
        "id": "st-eg-emb-main",
        "embassy": "Ambasada Republike Srbije (Egipat)",
        "embassyCyr": "Амбасада Републике Србије (Египат)",
        "email": "serbia@serbiaeg.comkonzul",
        "isElectionContactConfirmed": false,
        "website": "https://cairo.mfa.gov.rs",
        "address": "33, Al Mansour Mohamed St.,ZAMALEKКАИРОЕГИПАТ",
        "isResident": true
      }
    ],
    "aliases": [
      "Egipat",
      "Египат"
    ]
  },
  {
    "countryCode": "EC",
    "label": "Ekvador",
    "labelCyr": "Еквадор",
    "stations": [
      {
        "id": "st-nonres-ec",
        "embassy": "Ambasada Republike Srbije (Argentina) (pokriva Ekvador)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина) (покрива Еквадор)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": false
      }
    ],
    "aliases": [
      "Ekvador",
      "Еквадор"
    ]
  },
  {
    "countryCode": "GQ",
    "label": "Ekvatorijalna Gvineja",
    "labelCyr": "Екваторијална Гвинеја",
    "stations": [
      {
        "id": "st-nonres-gq",
        "embassy": "Ambasada Republike Srbije (Angola) (pokriva Ekvatorijalna Gvineja)",
        "embassyCyr": "Амбасада Републике Србије (Ангола) (покрива Екваторијална Гвинеја)",
        "email": "srb.emb.angola@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://luanda.mfa.gov.rs",
        "address": "Comandante N'Zaji 25/27, AlvaladeЛУАНДААНГОЛА",
        "isResident": false
      }
    ],
    "aliases": [
      "Ekvatorijalna Gvineja",
      "Екваторијална Гвинеја"
    ]
  },
  {
    "countryCode": "SV",
    "label": "El Salvador",
    "labelCyr": "Ел Салвадор",
    "stations": [
      {
        "id": "st-nonres-sv",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva El Salvador)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Ел Салвадор)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "El Salvador",
      "Ел Салвадор"
    ]
  },
  {
    "countryCode": "ER",
    "label": "Eritreja",
    "labelCyr": "Еритреја",
    "stations": [
      {
        "id": "st-nonres-er",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Eritreja)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Еритреја)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Eritreja",
      "Еритреја"
    ]
  },
  {
    "countryCode": "SZ",
    "label": "Esvatini",
    "labelCyr": "Есватини",
    "stations": [
      {
        "id": "st-nonres-sz",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Esvatini)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Есватини)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Esvatini",
      "Есватини"
    ]
  },
  {
    "countryCode": "EE",
    "label": "Estonija",
    "labelCyr": "Естонија",
    "stations": [
      {
        "id": "st-nonres-ee",
        "embassy": "Ambasada Republike Srbije (Finska) (pokriva Estonija)",
        "embassyCyr": "Амбасада Републике Србије (Финска) (покрива Естонија)",
        "email": "info@serbianembassy.fi",
        "isElectionContactConfirmed": true,
        "website": "https://helsinki.mfa.gov.rs",
        "address": "Kulosaarentie 3600570 ХЕЛСИНКИФИНСКА",
        "isResident": false
      }
    ],
    "aliases": [
      "Estonija",
      "Естонија"
    ]
  },
  {
    "countryCode": "ET",
    "label": "Etiopija",
    "labelCyr": "Етиопија",
    "stations": [
      {
        "id": "st-et-emb-main",
        "embassy": "Ambasada Republike Srbije (Etiopija)",
        "embassyCyr": "Амбасада Републике Србије (Етиопија)",
        "email": "serbambadis@yahoo.com",
        "isElectionContactConfirmed": false,
        "website": "https://addisababa.mfa.gov.rs",
        "address": "",
        "isResident": true
      }
    ],
    "aliases": [
      "Etiopija",
      "Етиопија"
    ]
  },
  {
    "countryCode": "ZM",
    "label": "Zambija",
    "labelCyr": "Замбија",
    "stations": [
      {
        "id": "st-zm-emb-main",
        "embassy": "Ambasada Republike Srbije (Zambija)",
        "embassyCyr": "Амбасада Републике Србије (Замбија)",
        "email": "srb.emb.zambia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://lusaka.mfa.gov.rs",
        "address": "5216, Diplomatic Triangleoff Indepedence Av.ЛУСАКАЗАМБИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Zambija",
      "Замбија"
    ]
  },
  {
    "countryCode": "CV",
    "label": "Zelenortska Ostrva",
    "labelCyr": "Зеленортска Острва",
    "stations": [
      {
        "id": "st-nonres-cv",
        "embassy": "Ambasada Republike Srbije (Portugalija) (pokriva Zelenortska Ostrva)",
        "embassyCyr": "Амбасада Републике Србије (Португалија) (покрива Зеленортска Острва)",
        "email": "serviaemba@netcabo.pt",
        "isElectionContactConfirmed": false,
        "website": "https://www.lisbon.mfa.gov.rs",
        "address": "Rua de Alcolena 11 1400 – 004 ЛИСАБОН ПОРТУГАЛ",
        "isResident": false
      }
    ],
    "aliases": [
      "Zelenortska Ostrva",
      "Зеленортска Острва"
    ]
  },
  {
    "countryCode": "ZW",
    "label": "Zimbabve",
    "labelCyr": "Зимбабве",
    "stations": [
      {
        "id": "st-zw-emb-main",
        "embassy": "Ambasada Republike Srbije (Zimbabve)",
        "embassyCyr": "Амбасада Републике Србије (Зимбабве)",
        "email": "ambasadaharare@yahoo.com",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "Lanark Road 1 Belgravia - Harare Република Зимбабве",
        "isResident": true
      }
    ],
    "aliases": [
      "Zimbabve",
      "Зимбабве"
    ]
  },
  {
    "countryCode": "IL",
    "label": "Izrael",
    "labelCyr": "Израел",
    "stations": [
      {
        "id": "st-il-emb-main",
        "embassy": "Ambasada Republike Srbije (Izrael)",
        "embassyCyr": "Амбасада Републике Србије (Израел)",
        "email": "srb.emb.israel@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://telaviv.mfa.gov.rs",
        "address": "10, Bodenheimer St.62008 ТЕЛ АВИВИЗРАЕЛ",
        "isResident": true
      }
    ],
    "aliases": [
      "Izrael",
      "Израел"
    ]
  },
  {
    "countryCode": "IN",
    "label": "Indija",
    "labelCyr": "Индија",
    "stations": [
      {
        "id": "st-in-emb-main",
        "embassy": "Ambasada Republike Srbije (Indija)",
        "embassyCyr": "Амбасада Републике Србије (Индија)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Indija",
      "Индија"
    ]
  },
  {
    "countryCode": "ID",
    "label": "Indonezija",
    "labelCyr": "Индонезија",
    "stations": [
      {
        "id": "st-id-emb-main",
        "embassy": "Ambasada Republike Srbije (Indonezija)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Indonezija",
      "Индонезија"
    ]
  },
  {
    "countryCode": "IQ",
    "label": "Irak",
    "labelCyr": "Ирак",
    "stations": [
      {
        "id": "st-iq-emb-main",
        "embassy": "Ambasada Republike Srbije (Irak)",
        "embassyCyr": "Амбасада Републике Србије (Ирак)",
        "email": "embsrbag@yahoo.com",
        "isElectionContactConfirmed": false,
        "website": "https://baghdad.mfa.gov.rs",
        "address": "Jadriyah Mahala 923,Zukak 3, House 3Hay BabilБагдадИрак",
        "isResident": true
      }
    ],
    "aliases": [
      "Irak",
      "Ирак"
    ]
  },
  {
    "countryCode": "IR",
    "label": "Iran",
    "labelCyr": "Иран",
    "stations": [
      {
        "id": "st-ir-emb-main",
        "embassy": "Ambasada Republike Srbije (Iran)",
        "embassyCyr": "Амбасада Републике Србије (Иран)",
        "email": "konzularno@serbiatehran.com",
        "isElectionContactConfirmed": false,
        "website": "https://tehran.mfa.gov.rs",
        "address": "No. 3, 4th Alley, North Mohammad Reza Shajarian St.,Shahrak e Qods (Gharb), Tehran, IRAN",
        "isResident": true
      }
    ],
    "aliases": [
      "Iran",
      "Иран"
    ]
  },
  {
    "countryCode": "IE",
    "label": "Irska",
    "labelCyr": "Ирска",
    "stations": [
      {
        "id": "st-nonres-ie",
        "embassy": "Ambasada Republike Srbije (Ujedinjeno Kraljevstvo) (pokriva Irska)",
        "embassyCyr": "Амбасада Републике Србије (Уједињено Краљевство) (покрива Ирска)",
        "email": "izbori.london@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://www.london.mfa.gov.rs",
        "address": "28 Belgrave Square ЛОНДОН SW1X 8QB ВЕЛИКА БРИТАНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Irska",
      "Ирска"
    ]
  },
  {
    "countryCode": "IS",
    "label": "Island",
    "labelCyr": "Исланд",
    "stations": [
      {
        "id": "st-nonres-is",
        "embassy": "Ambasada Republike Srbije (Norveška) (pokriva Island)",
        "embassyCyr": "Амбасада Републике Србије (Норвешка) (покрива Исланд)",
        "email": "ambasada@serbianembassy.no",
        "isElectionContactConfirmed": false,
        "website": "https://www.oslo.mfa.gov.rs",
        "address": "Munkedamsveien 59B0270 ОСЛОНОРВЕШКА",
        "isResident": false
      }
    ],
    "aliases": [
      "Island",
      "Исланд"
    ]
  },
  {
    "countryCode": "TL",
    "label": "Istočni Timor",
    "labelCyr": "Источни Тимор",
    "stations": [
      {
        "id": "st-nonres-tl",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Istočni Timor)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Источни Тимор)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Istočni Timor",
      "Источни Тимор"
    ]
  },
  {
    "countryCode": "IT",
    "label": "Italija",
    "labelCyr": "Италија",
    "stations": [
      {
        "id": "st-it-emb-main",
        "embassy": "Ambasada Republike Srbije (Italija)",
        "embassyCyr": "Амбасада Републике Србије (Италија)",
        "email": "izbori.rim@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://roma.mfa.gov.rs",
        "address": "Via dei Monti Parioli 2000197 РИМИТАЛИЈА",
        "isResident": true
      },
      {
        "id": "st-it-cons-trst",
        "embassy": "Generalni konzulat Republike Srbije (Trst)",
        "embassyCyr": "Генерални конзулат Републике Србије (Трст)",
        "email": "gkrstrst@spin.it",
        "isElectionContactConfirmed": false,
        "website": "https://trieste.mfa.gov.rs",
        "address": "Strada del Friuli 5434136 ТРСТИТАЛИЈА",
        "isResident": true
      },
      {
        "id": "st-it-cons-milano",
        "embassy": "Generalni konzulat Republike Srbije (Milano)",
        "embassyCyr": "Генерални конзулат Републике Србије (Милано)",
        "email": "pi@gkrsmi.it",
        "isElectionContactConfirmed": true,
        "website": "https://milano.mfa.gov.rs",
        "address": "Via Pantano 220122 МИЛАНОИТАЛИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Italija",
      "Италија"
    ]
  },
  {
    "countryCode": "JM",
    "label": "Jamajka",
    "labelCyr": "Јамајка",
    "stations": [
      {
        "id": "st-nonres-jm",
        "embassy": "Ambasada Republike Srbije (Kuba) (pokriva Jamajka)",
        "embassyCyr": "Амбасада Републике Србије (Куба) (покрива Јамајка)",
        "email": "officesrbhav@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://havana.mfa.gov.rs",
        "address": "5ta Avenida, No. 4406, entre 44 y 46,Miramar Playa,ХАВАНА,КУБА",
        "isResident": false
      }
    ],
    "aliases": [
      "Jamajka",
      "Јамајка"
    ]
  },
  {
    "countryCode": "JP",
    "label": "Japan",
    "labelCyr": "Јапан",
    "stations": [
      {
        "id": "st-jp-emb-main",
        "embassy": "Ambasada Republike Srbije (Japan)",
        "embassyCyr": "Амбасада Републике Србије (Јапан)",
        "email": "srb.emb.japan@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://tokyo.mfa.gov.rs",
        "address": "4-16-12 Takanawa,Minato-ku108-0074 ТОКИОЈАПАН",
        "isResident": true
      }
    ],
    "aliases": [
      "Japan",
      "Јапан"
    ]
  },
  {
    "countryCode": "YE",
    "label": "Jemen",
    "labelCyr": "Јемен",
    "stations": [
      {
        "id": "st-nonres-ye",
        "embassy": "Ambasada Republike Srbije (Kuvajt) (pokriva Jemen)",
        "embassyCyr": "Амбасада Републике Србије (Кувајт) (покрива Јемен)",
        "email": "embrskw@gmail.comserbkonzkw",
        "isElectionContactConfirmed": false,
        "website": "https://kuwait.mfa.gov.rs",
        "address": "BayanBlock No. 13, Street No. 1, Villa No.18Safat 13066P.O. Box 20511КУВАЈТКУВАЈТ",
        "isResident": false
      }
    ],
    "aliases": [
      "Jemen",
      "Јемен"
    ]
  },
  {
    "countryCode": "AM",
    "label": "Jermenija",
    "labelCyr": "Јерменија",
    "stations": [
      {
        "id": "st-am-emb-main",
        "embassy": "Ambasada Republike Srbije (Jermenija)",
        "embassyCyr": "Амбасада Републике Србије (Јерменија)",
        "email": "embserbia.yerevan@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "10 Vazgen Sargsyan St. 0010 Yerevan Piazza Grande Business Center, 1st floor, office 109",
        "isResident": true
      }
    ],
    "aliases": [
      "Jermenija",
      "Јерменија"
    ]
  },
  {
    "countryCode": "JO",
    "label": "Jordan",
    "labelCyr": "Јордан",
    "stations": [
      {
        "id": "st-nonres-jo",
        "embassy": "Ambasada Republike Srbije (Sirija) (pokriva Jordan)",
        "embassyCyr": "Амбасада Републике Србије (Сирија) (покрива Јордан)",
        "email": "srb.emb.syria@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://damascus.mfa.gov.rs",
        "address": "Mazzeh Eastern Villas, Farabi Street,Damascus,Syria",
        "isResident": false
      }
    ],
    "aliases": [
      "Jordan",
      "Јордан"
    ]
  },
  {
    "countryCode": "ZA",
    "label": "Južna Afrika",
    "labelCyr": "Јужна Африка",
    "stations": [
      {
        "id": "st-za-emb-main",
        "embassy": "Ambasada Republike Srbije (Južna Afrika)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": true
      }
    ],
    "aliases": [
      "Južna Afrika",
      "Јужна Африка"
    ]
  },
  {
    "countryCode": "KR",
    "label": "Južna Koreja",
    "labelCyr": "Јужна Кореја",
    "stations": [
      {
        "id": "st-kr-emb-main",
        "embassy": "Ambasada Republike Srbije (Južna Koreja)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Кореја)",
        "email": "srb.emb.repkorea@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://seoul.mfa.gov.rs",
        "address": "22nd Floor, Booyoung Taepyeong Building,55 Sejong-daero,Jung-guСЕУЛРЕПУБЛИКА КОРЕЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Južna Koreja",
      "Јужна Кореја"
    ]
  },
  {
    "countryCode": "SS",
    "label": "Južni Sudan",
    "labelCyr": "Јужни Судан",
    "stations": [
      {
        "id": "st-nonres-ss",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Južni Sudan)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Јужни Судан)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Južni Sudan",
      "Јужни Судан"
    ]
  },
  {
    "countryCode": "KZ",
    "label": "Kazahstan",
    "labelCyr": "Казахстан",
    "stations": [
      {
        "id": "st-kz-emb-main",
        "embassy": "Ambasada Republike Srbije (Kazahstan)",
        "embassyCyr": "Амбасада Републике Србије (Казахстан)",
        "email": "amb.astana@mail.ru",
        "isElectionContactConfirmed": false,
        "website": "https://astana.mfa.gov.rs",
        "address": "Sariarka 6010000 АстанаРепублика Казахстан",
        "isResident": true
      }
    ],
    "aliases": [
      "Kazahstan",
      "Казахстан"
    ]
  },
  {
    "countryCode": "KH",
    "label": "Kambodža",
    "labelCyr": "Камбоџа",
    "stations": [
      {
        "id": "st-nonres-kh",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Kambodža)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Камбоџа)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Kambodža",
      "Камбоџа"
    ]
  },
  {
    "countryCode": "CM",
    "label": "Kamerun",
    "labelCyr": "Камерун",
    "stations": [
      {
        "id": "st-nonres-cm",
        "embassy": "Ambasada Republike Srbije (Demokratska Republika Kongo) (pokriva Kamerun)",
        "embassyCyr": "Амбасада Републике Србије (Демократска Република Конго) (покрива Камерун)",
        "email": "serbambakin@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://kinshasa.mfa.gov.rs",
        "address": "Avenue de 1 Etoile 112,Gombe, КИНШАСА, КОНГО, ДР",
        "isResident": false
      }
    ],
    "aliases": [
      "Kamerun",
      "Камерун"
    ]
  },
  {
    "countryCode": "CA",
    "label": "Kanada",
    "labelCyr": "Канада",
    "stations": [
      {
        "id": "st-ca-emb-main",
        "embassy": "Ambasada Republike Srbije (Kanada)",
        "embassyCyr": "Амбасада Републике Србије (Канада)",
        "email": "communication.ottawa@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://ottawa.mfa.gov.rs",
        "address": "21, Blackburn AvenueОТАВА Онтарио K1N 8A2КАНАДА",
        "isResident": true
      },
      {
        "id": "st-ca-cons-toronto",
        "embassy": "Generalni konzulat Republike Srbije (Toronto)",
        "embassyCyr": "Генерални конзулат Републике Србије (Торонто)",
        "email": "izbori@rogers.com",
        "isElectionContactConfirmed": true,
        "website": "https://toronto.mfa.gov.rs",
        "address": "40 Eglinton Avenue East, 7 floor,unit 701 M4P 3A2ТОРОНТО, ON M4P 3A2КАНАДА",
        "isResident": true
      }
    ],
    "aliases": [
      "Kanada",
      "Канада"
    ]
  },
  {
    "countryCode": "QA",
    "label": "Katar",
    "labelCyr": "Катар",
    "stations": [
      {
        "id": "st-qa-emb-main",
        "embassy": "Ambasada Republike Srbije (Katar)",
        "embassyCyr": "Амбасада Републике Србије (Катар)",
        "email": "srb.emb.qatar@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://doha.mfa.gov.rs",
        "address": "Zone 66, West Bay, Um Al Seneem no.5,Doha, Qatar, P.O. Box 22195,Катар",
        "isResident": true
      }
    ],
    "aliases": [
      "Katar",
      "Катар"
    ]
  },
  {
    "countryCode": "KE",
    "label": "Kenija",
    "labelCyr": "Кенија",
    "stations": [
      {
        "id": "st-ke-emb-main",
        "embassy": "Ambasada Republike Srbije (Kenija)",
        "embassyCyr": "Амбасада Републике Србије (Кенија)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Kenija",
      "Кенија"
    ]
  },
  {
    "countryCode": "CN",
    "label": "Kina",
    "labelCyr": "Кина",
    "stations": [
      {
        "id": "st-cn-emb-main",
        "embassy": "Ambasada Republike Srbije (Kina)",
        "embassyCyr": "Амбасада Републике Србије (Кина)",
        "email": "embserbia@embserbia.cn",
        "isElectionContactConfirmed": false,
        "website": "https://beijing.mfa.gov.rs",
        "address": "San Li Tun, Dong 6 Jie 1100600 ПЕКИНГН.Р. КИНА",
        "isResident": true
      },
      {
        "id": "st-cn-cons-angaj",
        "embassy": "Generalni konzulat Republike Srbije (Šangaj)",
        "embassyCyr": "Генерални конзулат Републике Србије (Шангај)",
        "email": "srb.cons.shanghai@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://shanghai.mfa.gov.rs",
        "address": "Rm, 801, No.1, Lane 60, Lyon Garden,Ronghua East Road, Gu Bei New Area,ШАНГАЈ 201103Н.Р. КИНА",
        "isResident": true
      }
    ],
    "aliases": [
      "Kina",
      "Кина"
    ]
  },
  {
    "countryCode": "CY",
    "label": "Kipar",
    "labelCyr": "Кипар",
    "stations": [
      {
        "id": "st-cy-emb-main",
        "embassy": "Ambasada Republike Srbije (Kipar)",
        "embassyCyr": "Амбасада Републике Србије (Кипар)",
        "email": "nicosia@serbia.org.cy",
        "isElectionContactConfirmed": false,
        "website": "https://nicosia.mfa.gov.rs",
        "address": "2, Vasilissis Olgas Street1101 НИКОЗИЈА КИПАР",
        "isResident": true
      }
    ],
    "aliases": [
      "Kipar",
      "Кипар"
    ]
  },
  {
    "countryCode": "KG",
    "label": "Kirgistan",
    "labelCyr": "Киргизија",
    "stations": [
      {
        "id": "st-nonres-kg",
        "embassy": "Ambasada Republike Srbije (Rusija) (pokriva Kirgistan)",
        "embassyCyr": "Амбасада Републике Србије (Русија) (покрива Киргизија)",
        "email": "konzularno.moskva@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.moskva.mfa.gov.rs",
        "address": "Mosfiljmovskaja 46 R-119285 МОСКВА РУСКА ФЕДЕРАЦИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Kirgistan",
      "Kirgizija",
      "Киргизија"
    ]
  },
  {
    "countryCode": "KI",
    "label": "Kiribati",
    "labelCyr": "Кирибати",
    "stations": [
      {
        "id": "st-nonres-ki",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Kiribati)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Кирибати)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Kiribati",
      "Кирибати"
    ]
  },
  {
    "countryCode": "CO",
    "label": "Kolumbija",
    "labelCyr": "Колумбија",
    "stations": [
      {
        "id": "st-nonres-co",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Kolumbija)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Колумбија)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Kolumbija",
      "Колумбија"
    ]
  },
  {
    "countryCode": "CR",
    "label": "Kostarika",
    "labelCyr": "Костарика",
    "stations": [
      {
        "id": "st-nonres-cr",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva Kostarika)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Костарика)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "Kostarika",
      "Костарика"
    ]
  },
  {
    "countryCode": "CU",
    "label": "Kuba",
    "labelCyr": "Куба",
    "stations": [
      {
        "id": "st-cu-emb-main",
        "embassy": "Ambasada Republike Srbije (Kuba)",
        "embassyCyr": "Амбасада Републике Србије (Куба)",
        "email": "officesrbhav@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://havana.mfa.gov.rs",
        "address": "5ta Avenida, No. 4406, entre 44 y 46,Miramar Playa,ХАВАНА,КУБА",
        "isResident": true
      }
    ],
    "aliases": [
      "Kuba",
      "Куба"
    ]
  },
  {
    "countryCode": "KW",
    "label": "Kuvajt",
    "labelCyr": "Кувајт",
    "stations": [
      {
        "id": "st-kw-emb-main",
        "embassy": "Ambasada Republike Srbije (Kuvajt)",
        "embassyCyr": "Амбасада Републике Србије (Кувајт)",
        "email": "embrskw@gmail.comserbkonzkw",
        "isElectionContactConfirmed": false,
        "website": "https://kuwait.mfa.gov.rs",
        "address": "BayanBlock No. 13, Street No. 1, Villa No.18Safat 13066P.O. Box 20511КУВАЈТКУВАЈТ",
        "isResident": true
      }
    ],
    "aliases": [
      "Kuvajt",
      "Кувајт"
    ]
  },
  {
    "countryCode": "LA",
    "label": "Laos",
    "labelCyr": "Лаос",
    "stations": [
      {
        "id": "st-nonres-la",
        "embassy": "Ambasada Republike Srbije (Mjanmar) (pokriva Laos)",
        "embassyCyr": "Амбасада Републике Србије (Мјанмар) (покрива Лаос)",
        "email": "serbemb@yangon.net.mm",
        "isElectionContactConfirmed": false,
        "website": "https://yangon.mfa.gov.rs",
        "address": "114-A Inya Road,Kamayut TownshipЈАНГОНМЈАНМАР",
        "isResident": false
      }
    ],
    "aliases": [
      "Laos",
      "Лаос"
    ]
  },
  {
    "countryCode": "LS",
    "label": "Lesoto",
    "labelCyr": "Лесото",
    "stations": [
      {
        "id": "st-nonres-ls",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Lesoto)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Лесото)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Lesoto",
      "Лесото"
    ]
  },
  {
    "countryCode": "LV",
    "label": "Letonija",
    "labelCyr": "Летонија",
    "stations": [
      {
        "id": "st-lv-emb-main-srb-emb-latvia",
        "embassy": "Ambasada Republike Srbije (Letonija)",
        "embassyCyr": "Амбасада Републике Србије (Летонија)",
        "email": "srb.emb.latvia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "",
        "isResident": true
      },
      {
        "id": "st-lv-emb-main-stockholm-mfa-gov-rs",
        "embassy": "Ambasada Republike Srbije (Letonija)",
        "embassyCyr": "Амбасада Републике Србије (Летонија)",
        "email": "srb.emb.sweden@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://stockholm.mfa.gov.rs",
        "address": "Hantverkargatan 26,3rd floorBox 529 101 30СТОКХОЛМШВЕДСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Letonija",
      "Летонија"
    ]
  },
  {
    "countryCode": "LB",
    "label": "Liban",
    "labelCyr": "Либан",
    "stations": [
      {
        "id": "st-lb-emb-main",
        "embassy": "Ambasada Republike Srbije (Liban)",
        "embassyCyr": "Амбасада Републике Србије (Либан)",
        "email": "beirut.dkp@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://beirut.mfa.gov.rs",
        "address": "Jounieh-Kaslik Roundabout,Etoile Center (Zara Building),2nd floor,Lebanon",
        "isResident": true
      }
    ],
    "aliases": [
      "Liban",
      "Либан"
    ]
  },
  {
    "countryCode": "LR",
    "label": "Liberija",
    "labelCyr": "Либерија",
    "stations": [
      {
        "id": "st-nonres-lr",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Liberija)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Либерија)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Liberija",
      "Либерија"
    ]
  },
  {
    "countryCode": "LY",
    "label": "Libija",
    "labelCyr": "Либија",
    "stations": [
      {
        "id": "st-ly-emb-main",
        "embassy": "Ambasada Republike Srbije (Libija)",
        "embassyCyr": "Амбасада Републике Србије (Либија)",
        "email": "srb.emb.libya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.tripoli.mfa.gov.rs",
        "address": "Kvart Ben Ašur, Abdal Ben Salam P.O.Box 1087 ТРИПОЛИ ЛИБИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Libija",
      "Либија"
    ]
  },
  {
    "countryCode": "LT",
    "label": "Litvanija",
    "labelCyr": "Литванија",
    "stations": [
      {
        "id": "st-nonres-lt",
        "embassy": "Ambasada Republike Srbije (Poljska) (pokriva Litvanija)",
        "embassyCyr": "Амбасада Републике Србије (Пољска) (покрива Литванија)",
        "email": "embassy.warsaw@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://warsaw.mfa.gov.rs",
        "address": "Aleja Róż 500-556 ВАРШАВАПОЉСКА",
        "isResident": false
      }
    ],
    "aliases": [
      "Litvanija",
      "Литванија"
    ]
  },
  {
    "countryCode": "LI",
    "label": "Lihtenštajn",
    "labelCyr": "Лихтенштајн",
    "stations": [
      {
        "id": "st-nonres-li",
        "embassy": "Ambasada Republike Srbije (Švajcarska) (pokriva Lihtenštajn)",
        "embassyCyr": "Амбасада Републике Србије (Швајцарска) (покрива Лихтенштајн)",
        "email": "info@ambasadasrbije.ch",
        "isElectionContactConfirmed": false,
        "website": "https://berne.mfa.gov.rs",
        "address": "Seminarstrasse 5CH-3006 БЕРНШВАЈЦАРСКА",
        "isResident": false
      }
    ],
    "aliases": [
      "Lihtenštajn",
      "Лихтенштајн"
    ]
  },
  {
    "countryCode": "LU",
    "label": "Luksemburg",
    "labelCyr": "Луксембург",
    "stations": [
      {
        "id": "st-nonres-lu",
        "embassy": "Ambasada Republike Srbije (Belgija) (pokriva Luksemburg)",
        "embassyCyr": "Амбасада Републике Србије (Белгија) (покрива Луксембург)",
        "email": "konzularno.brisel@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://brussels.mfa.gov.rs",
        "address": "Boulevard Du Regent 531000 БРИСЕЛБЕЛГИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Luksemburg",
      "Луксембург"
    ]
  },
  {
    "countryCode": "MG",
    "label": "Madagaskar",
    "labelCyr": "Мадагаскар",
    "stations": [
      {
        "id": "st-nonres-mg",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Madagaskar)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Мадагаскар)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Madagaskar",
      "Мадагаскар"
    ]
  },
  {
    "countryCode": "HU",
    "label": "Mađarska",
    "labelCyr": "Мађарска",
    "stations": [
      {
        "id": "st-hu-emb-main",
        "embassy": "Ambasada Republike Srbije (Mađarska)",
        "embassyCyr": "Амбасада Републике Србије (Мађарска)",
        "email": "budapest-consulat@serbiaemb.t-online.hu",
        "isElectionContactConfirmed": false,
        "website": "https://www.budapest.mfa.gov.rs",
        "address": "Dozsa Gyorgy ut 92/b H-1068 БУДИМПЕШТА МАЂАРСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Mađarska",
      "Мађарска"
    ]
  },
  {
    "countryCode": "MW",
    "label": "Malavi",
    "labelCyr": "Малави",
    "stations": [
      {
        "id": "st-nonres-mw",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Malavi)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Малави)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Malavi",
      "Малави"
    ]
  },
  {
    "countryCode": "MV",
    "label": "Maldivi",
    "labelCyr": "Малдиви",
    "stations": [
      {
        "id": "st-nonres-mv",
        "embassy": "Ambasada Republike Srbije (Indija) (pokriva Maldivi)",
        "embassyCyr": "Амбасада Републике Србије (Индија) (покрива Малдиви)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Maldivi",
      "Малдиви"
    ]
  },
  {
    "countryCode": "MY",
    "label": "Malezija",
    "labelCyr": "Малезија",
    "stations": [
      {
        "id": "st-nonres-my",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Malezija)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Малезија)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Malezija",
      "Малезија"
    ]
  },
  {
    "countryCode": "ML",
    "label": "Mali",
    "labelCyr": "Мали",
    "stations": [
      {
        "id": "st-nonres-ml",
        "embassy": "Ambasada Republike Srbije (Alžir) (pokriva Mali)",
        "embassyCyr": "Амбасада Републике Србије (Алжир) (покрива Мали)",
        "email": "consulat@ambserbie-alger.com",
        "isElectionContactConfirmed": true,
        "website": "https://alger.mfa.gov.rs",
        "address": "42, rue des Frères Benali Abdellah (ex rue Parmentier)B.P.366, HYDRAАЛЖИР",
        "isResident": false
      }
    ],
    "aliases": [
      "Mali",
      "Мали"
    ]
  },
  {
    "countryCode": "MT",
    "label": "Malta",
    "labelCyr": "Малта",
    "stations": [
      {
        "id": "st-mt-emb-main",
        "embassy": "Ambasada Republike Srbije (Malta)",
        "embassyCyr": "Амбасада Републике Србије (Малта)",
        "email": "srb.office.valletta@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://roma.mfa.gov.rs",
        "address": "Europa Centre, Level 3, Office 18/a, Triq Sant` Anna 58, Floriana, FRN,1400 Malta",
        "isResident": true
      }
    ],
    "aliases": [
      "Malta",
      "Малта"
    ]
  },
  {
    "countryCode": "MA",
    "label": "Maroko",
    "labelCyr": "Мароко",
    "stations": [
      {
        "id": "st-ma-emb-main",
        "embassy": "Ambasada Republike Srbije (Maroko)",
        "embassyCyr": "Амбасада Републике Србије (Мароко)",
        "email": "ambrsrabat@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://rabat.mfa.gov.rs",
        "address": "24, Rue El Kadi Ahmed MoulineSouissiРАБАТМАРОКОB.P.5014",
        "isResident": true
      }
    ],
    "aliases": [
      "Maroko",
      "Мароко"
    ]
  },
  {
    "countryCode": "MH",
    "label": "Maršalska Ostrva",
    "labelCyr": "Маршалска Острва",
    "stations": [
      {
        "id": "st-nonres-mh",
        "embassy": "Ambasada Republike Srbije (Japan) (pokriva Maršalska Ostrva)",
        "embassyCyr": "Амбасада Републике Србије (Јапан) (покрива Маршалска Острва)",
        "email": "srb.emb.japan@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://tokyo.mfa.gov.rs",
        "address": "4-16-12 Takanawa,Minato-ku108-0074 ТОКИОЈАПАН",
        "isResident": false
      }
    ],
    "aliases": [
      "Maršalska Ostrva",
      "Маршалска Острва"
    ]
  },
  {
    "countryCode": "MR",
    "label": "Mauritanija",
    "labelCyr": "Мауританија",
    "stations": [
      {
        "id": "st-nonres-mr",
        "embassy": "Ambasada Republike Srbije (Maroko) (pokriva Mauritanija)",
        "embassyCyr": "Амбасада Републике Србије (Мароко) (покрива Мауританија)",
        "email": "ambrsrabat@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://rabat.mfa.gov.rs",
        "address": "24, Rue El Kadi Ahmed MoulineSouissiРАБАТМАРОКОB.P.5014",
        "isResident": false
      }
    ],
    "aliases": [
      "Mauritanija",
      "Мауританија"
    ]
  },
  {
    "countryCode": "MU",
    "label": "Mauricijus",
    "labelCyr": "Маурицијус",
    "stations": [
      {
        "id": "st-nonres-mu",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Mauricijus)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Маурицијус)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Mauricijus",
      "Маурицијус"
    ]
  },
  {
    "countryCode": "MX",
    "label": "Meksiko",
    "labelCyr": "Мексико",
    "stations": [
      {
        "id": "st-mx-emb-main",
        "embassy": "Ambasada Republike Srbije (Meksiko)",
        "embassyCyr": "Амбасада Републике Србије (Мексико)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": true
      }
    ],
    "aliases": [
      "Meksiko",
      "Мексико"
    ]
  },
  {
    "countryCode": "FM",
    "label": "Mikronezija",
    "labelCyr": "Микронезија",
    "stations": [
      {
        "id": "st-nonres-fm",
        "embassy": "Ambasada Republike Srbije (Japan) (pokriva Mikronezija)",
        "embassyCyr": "Амбасада Републике Србије (Јапан) (покрива Микронезија)",
        "email": "srb.emb.japan@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://tokyo.mfa.gov.rs",
        "address": "4-16-12 Takanawa,Minato-ku108-0074 ТОКИОЈАПАН",
        "isResident": false
      }
    ],
    "aliases": [
      "Mikronezija",
      "Микронезија"
    ]
  },
  {
    "countryCode": "MM",
    "label": "Mjanmar",
    "labelCyr": "Мјанмар",
    "stations": [
      {
        "id": "st-mm-emb-main",
        "embassy": "Ambasada Republike Srbije (Mjanmar)",
        "embassyCyr": "Амбасада Републике Србије (Мјанмар)",
        "email": "serbemb@yangon.net.mm",
        "isElectionContactConfirmed": false,
        "website": "https://yangon.mfa.gov.rs",
        "address": "114-A Inya Road,Kamayut TownshipЈАНГОНМЈАНМАР",
        "isResident": true
      }
    ],
    "aliases": [
      "Mjanmar",
      "Мјанмар"
    ]
  },
  {
    "countryCode": "MZ",
    "label": "Mozambik",
    "labelCyr": "Мозамбик",
    "stations": [
      {
        "id": "st-nonres-mz",
        "embassy": "Ambasada Republike Srbije (Južna Afrika) (pokriva Mozambik)",
        "embassyCyr": "Амбасада Републике Србије (Јужна Африка) (покрива Мозамбик)",
        "email": "info@srbembassy.org.za",
        "isElectionContactConfirmed": false,
        "website": "https://pretoria.mfa.gov.rs",
        "address": "Marais163,Brooklyn 0181, P.O.B 13026HATFIELD 0028ПреторијаЈужна Африка",
        "isResident": false
      }
    ],
    "aliases": [
      "Mozambik",
      "Мозамбик"
    ]
  },
  {
    "countryCode": "MD",
    "label": "Moldavija",
    "labelCyr": "Молдавија",
    "stations": [
      {
        "id": "st-nonres-md",
        "embassy": "Ambasada Republike Srbije (Rumunija) (pokriva Moldavija)",
        "embassyCyr": "Амбасада Републике Србије (Румунија) (покрива Молдавија)",
        "email": "consulate.bucharest@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://bucharest.mfa.gov.rs",
        "address": "General Eremia Grigorescu nr. 12БукурештРумунија",
        "isResident": false
      }
    ],
    "aliases": [
      "Moldavija",
      "Молдавија"
    ]
  },
  {
    "countryCode": "MC",
    "label": "Monako",
    "labelCyr": "Монако",
    "stations": [
      {
        "id": "st-nonres-mc-paris-mfa-gov-rs",
        "embassy": "Ambasada Republike Srbije (Francuska) (pokriva Monako)",
        "embassyCyr": "Амбасада Републике Србије (Француска) (покрива Монако)",
        "email": "ambassade.paris@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.paris.mfa.gov.rs",
        "address": "5, Rue Leonard de Vinci 75116 ПАРИЗ ФРАНЦУСКА",
        "isResident": false
      },
      {
        "id": "st-nonres-mc-info",
        "embassy": "Nadležno diplomatsko predstavništvo (pokriva Monako)",
        "embassyCyr": "Надлежно дипломатско представништво (покрива Монако)",
        "email": "info@ccserbie.com",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "123, Rue St Martin 75004 ПАРИЗ ФРАНЦУСКА",
        "isResident": false
      }
    ],
    "aliases": [
      "Monako",
      "Монако"
    ]
  },
  {
    "countryCode": "MN",
    "label": "Mongolija",
    "labelCyr": "Монголија",
    "stations": [
      {
        "id": "st-nonres-mn",
        "embassy": "Ambasada Republike Srbije (Kina) (pokriva Mongolija)",
        "embassyCyr": "Амбасада Републике Србије (Кина) (покрива Монголија)",
        "email": "embserbia@embserbia.cn",
        "isElectionContactConfirmed": false,
        "website": "https://beijing.mfa.gov.rs",
        "address": "San Li Tun, Dong 6 Jie 1100600 ПЕКИНГН.Р. КИНА",
        "isResident": false
      }
    ],
    "aliases": [
      "Mongolija",
      "Монголија"
    ]
  },
  {
    "countryCode": "NA",
    "label": "Namibija",
    "labelCyr": "Намибија",
    "stations": [
      {
        "id": "st-nonres-na",
        "embassy": "Ambasada Republike Srbije (Angola) (pokriva Namibija)",
        "embassyCyr": "Амбасада Републике Србије (Ангола) (покрива Намибија)",
        "email": "srb.emb.angola@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://luanda.mfa.gov.rs",
        "address": "Comandante N'Zaji 25/27, AlvaladeЛУАНДААНГОЛА",
        "isResident": false
      }
    ],
    "aliases": [
      "Namibija",
      "Намибија"
    ]
  },
  {
    "countryCode": "NR",
    "label": "Nauru",
    "labelCyr": "Науру",
    "stations": [
      {
        "id": "st-nonres-nr",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Nauru)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Науру)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Nauru",
      "Науру"
    ]
  },
  {
    "countryCode": "DE",
    "label": "Nemačka",
    "labelCyr": "Немачка",
    "stations": [
      {
        "id": "st-de-emb-main",
        "embassy": "Ambasada Republike Srbije (Nemačka)",
        "embassyCyr": "Амбасада Републике Србије (Немачка)",
        "email": "izbori@botschaft-serbien.de",
        "isElectionContactConfirmed": true,
        "website": "https://berlin.mfa.gov.rs",
        "address": "Taubert Strasse 18D-14193 БЕРЛИННЕМАЧКА",
        "isResident": true
      },
      {
        "id": "st-de-cons-tutgart",
        "embassy": "Generalni konzulat Republike Srbije (Štutgart)",
        "embassyCyr": "Генерални конзулат Републике Србије (Штутгарт)",
        "email": "gk-stutgart@t-online.de",
        "isElectionContactConfirmed": false,
        "website": "https://stuttgart.mfa.gov.rs",
        "address": "Taubenstrasse 4D-70199 ШТУТГАРТНЕМАЧКА",
        "isResident": true
      },
      {
        "id": "st-de-cons-hamburg",
        "embassy": "Generalni konzulat Republike Srbije (Hamburg)",
        "embassyCyr": "Генерални конзулат Републике Србије (Хамбург)",
        "email": "izbori@gkrshamburg.de",
        "isElectionContactConfirmed": true,
        "website": "https://hamburg.mfa.gov.rs",
        "address": "Harvestehuder Weg 101D-20149 ХАМБУРГНЕМАЧКА",
        "isResident": true
      },
      {
        "id": "st-de-cons-frankfurt",
        "embassy": "Generalni konzulat Republike Srbije (Frankfurt)",
        "embassyCyr": "Генерални конзулат Републике Србије (Франкфурт)",
        "email": "izbori@gksrbfra.de",
        "isElectionContactConfirmed": true,
        "website": "https://frankfurt.mfa.gov.rs",
        "address": "Thueringer Strasse 3D-60316 ФРАНКФУРТНЕМАЧКА",
        "isResident": true
      },
      {
        "id": "st-de-cons-minhen",
        "embassy": "Generalni konzulat Republike Srbije (Minhen)",
        "embassyCyr": "Генерални конзулат Републике Србије (Минхен)",
        "email": "gk.muenchen@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://munich.mfa.gov.rs",
        "address": "Bohmerwaldplatz 2D-81679 МИНХЕННЕМАЧКА",
        "isResident": true
      },
      {
        "id": "st-de-cons-diseldorf",
        "embassy": "Generalni konzulat Republike Srbije (Diseldorf)",
        "embassyCyr": "Генерални конзулат Републике Србије (Диселдорф)",
        "email": "info.dusseldorf@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://duesseldorf.mfa.gov.rs",
        "address": "Klosterstrasse 79D-40211 ДИСЕЛДОРФНЕМАЧКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Nemačka",
      "Немачка"
    ]
  },
  {
    "countryCode": "NP",
    "label": "Nepal",
    "labelCyr": "Непал",
    "stations": [
      {
        "id": "st-nonres-np",
        "embassy": "Ambasada Republike Srbije (Indija) (pokriva Nepal)",
        "embassyCyr": "Амбасада Републике Србије (Индија) (покрива Непал)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Nepal",
      "Непал"
    ]
  },
  {
    "countryCode": "NE",
    "label": "Niger",
    "labelCyr": "Нигер",
    "stations": [
      {
        "id": "st-nonres-ne",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Niger)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Нигер)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Niger",
      "Нигер"
    ]
  },
  {
    "countryCode": "NG",
    "label": "Nigerija",
    "labelCyr": "Нигерија",
    "stations": [
      {
        "id": "st-ng-emb-main",
        "embassy": "Ambasada Republike Srbije (Nigerija)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Nigerija",
      "Нигерија"
    ]
  },
  {
    "countryCode": "NI",
    "label": "Nikaragva",
    "labelCyr": "Никарагва",
    "stations": [
      {
        "id": "st-nonres-ni",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva Nikaragva)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Никарагва)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "Nikaragva",
      "Никарагва"
    ]
  },
  {
    "countryCode": "NZ",
    "label": "Novi Zeland",
    "labelCyr": "Нови Зеланд",
    "stations": [
      {
        "id": "st-nonres-nz",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Novi Zeland)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Нови Зеланд)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Novi Zeland",
      "Нови Зеланд"
    ]
  },
  {
    "countryCode": "NO",
    "label": "Norveška",
    "labelCyr": "Норвешка",
    "stations": [
      {
        "id": "st-no-emb-main",
        "embassy": "Ambasada Republike Srbije (Norveška)",
        "embassyCyr": "Амбасада Републике Србије (Норвешка)",
        "email": "izbori.oslo2026@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://www.oslo.mfa.gov.rs",
        "address": "Munkedamsveien 59B0270 ОСЛОНОРВЕШКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Norveška",
      "Норвешка"
    ]
  },
  {
    "countryCode": "CI",
    "label": "Obala Slonovače",
    "labelCyr": "Обала Слоноваче",
    "stations": [
      {
        "id": "st-nonres-ci",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Obala Slonovače)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Обала Слоноваче)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Obala Slonovače",
      "Обала Слоноваче"
    ]
  },
  {
    "countryCode": "OM",
    "label": "Oman",
    "labelCyr": "Оман",
    "stations": [
      {
        "id": "st-nonres-om",
        "embassy": "Ambasada Republike Srbije (Egipat) (pokriva Oman)",
        "embassyCyr": "Амбасада Републике Србије (Египат) (покрива Оман)",
        "email": "serbia@serbiaeg.comkonzul",
        "isElectionContactConfirmed": false,
        "website": "https://cairo.mfa.gov.rs",
        "address": "33, Al Mansour Mohamed St.,ZAMALEKКАИРОЕГИПАТ",
        "isResident": false
      }
    ],
    "aliases": [
      "Oman",
      "Оман"
    ]
  },
  {
    "countryCode": "PK",
    "label": "Pakistan",
    "labelCyr": "Пакистан",
    "stations": [
      {
        "id": "st-nonres-pk",
        "embassy": "Ambasada Republike Srbije (Iran) (pokriva Pakistan)",
        "embassyCyr": "Амбасада Републике Србије (Иран) (покрива Пакистан)",
        "email": "konzularno@serbiatehran.com",
        "isElectionContactConfirmed": false,
        "website": "https://tehran.mfa.gov.rs",
        "address": "No. 3, 4th Alley, North Mohammad Reza Shajarian St.,Shahrak e Qods (Gharb), Tehran, IRAN",
        "isResident": false
      }
    ],
    "aliases": [
      "Pakistan",
      "Пакистан"
    ]
  },
  {
    "countryCode": "PW",
    "label": "Palau",
    "labelCyr": "Палау",
    "stations": [
      {
        "id": "st-nonres-pw",
        "embassy": "Ambasada Republike Srbije (Japan) (pokriva Palau)",
        "embassyCyr": "Амбасада Републике Србије (Јапан) (покрива Палау)",
        "email": "srb.emb.japan@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://tokyo.mfa.gov.rs",
        "address": "4-16-12 Takanawa,Minato-ku108-0074 ТОКИОЈАПАН",
        "isResident": false
      }
    ],
    "aliases": [
      "Palau",
      "Палау"
    ]
  },
  {
    "countryCode": "PS",
    "label": "Palestina",
    "labelCyr": "Палестина",
    "stations": [
      {
        "id": "st-nonres-ps",
        "embassy": "Ambasada Republike Srbije (Egipat) (pokriva Palestina)",
        "embassyCyr": "Амбасада Републике Србије (Египат) (покрива Палестина)",
        "email": "serbia@serbiaeg.comkonzul",
        "isElectionContactConfirmed": false,
        "website": "https://cairo.mfa.gov.rs",
        "address": "33, Al Mansour Mohamed St.,ZAMALEKКАИРОЕГИПАТ",
        "isResident": false
      }
    ],
    "aliases": [
      "Palestina",
      "Палестина"
    ]
  },
  {
    "countryCode": "PA",
    "label": "Panama",
    "labelCyr": "Панама",
    "stations": [
      {
        "id": "st-nonres-pa",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva Panama)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Панама)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "Panama",
      "Панама"
    ]
  },
  {
    "countryCode": "PG",
    "label": "Papua Nova Gvineja",
    "labelCyr": "Папуа Нова Гвинеја",
    "stations": [
      {
        "id": "st-nonres-pg",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Papua Nova Gvineja)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Папуа Нова Гвинеја)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Papua Nova Gvineja",
      "Папуа Нова Гвинеја"
    ]
  },
  {
    "countryCode": "PY",
    "label": "Paragvaj",
    "labelCyr": "Парагвај",
    "stations": [
      {
        "id": "st-nonres-py",
        "embassy": "Ambasada Republike Srbije (Argentina) (pokriva Paragvaj)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина) (покрива Парагвај)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": false
      }
    ],
    "aliases": [
      "Paragvaj",
      "Парагвај"
    ]
  },
  {
    "countryCode": "PE",
    "label": "Peru",
    "labelCyr": "Перу",
    "stations": [
      {
        "id": "st-nonres-pe",
        "embassy": "Ambasada Republike Srbije (Argentina) (pokriva Peru)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина) (покрива Перу)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": false
      }
    ],
    "aliases": [
      "Peru",
      "Перу"
    ]
  },
  {
    "countryCode": "PL",
    "label": "Poljska",
    "labelCyr": "Пољска",
    "stations": [
      {
        "id": "st-pl-emb-main",
        "embassy": "Ambasada Republike Srbije (Poljska)",
        "embassyCyr": "Амбасада Републике Србије (Пољска)",
        "email": "embassy.warsaw@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://warsaw.mfa.gov.rs",
        "address": "Aleja Róż 500-556 ВАРШАВАПОЉСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Poljska",
      "Пољска"
    ]
  },
  {
    "countryCode": "PT",
    "label": "Portugalija",
    "labelCyr": "Португалија",
    "stations": [
      {
        "id": "st-pt-emb-main",
        "embassy": "Ambasada Republike Srbije (Portugalija)",
        "embassyCyr": "Амбасада Републике Србије (Португалија)",
        "email": "serviaemba@netcabo.pt",
        "isElectionContactConfirmed": false,
        "website": "https://www.lisbon.mfa.gov.rs",
        "address": "Rua de Alcolena 11 1400 – 004 ЛИСАБОН ПОРТУГАЛ",
        "isResident": true
      }
    ],
    "aliases": [
      "Portugalija",
      "Португалија"
    ]
  },
  {
    "countryCode": "CG",
    "label": "Republika Kongo",
    "labelCyr": "Република Конго",
    "stations": [
      {
        "id": "st-nonres-cg",
        "embassy": "Ambasada Republike Srbije (Demokratska Republika Kongo) (pokriva Republika Kongo)",
        "embassyCyr": "Амбасада Републике Србије (Демократска Република Конго) (покрива Република Конго)",
        "email": "serbambakin@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://kinshasa.mfa.gov.rs",
        "address": "Avenue de 1 Etoile 112,Gombe, КИНШАСА, КОНГО, ДР",
        "isResident": false
      }
    ],
    "aliases": [
      "Republika Kongo",
      "Република Конго"
    ]
  },
  {
    "countryCode": "RW",
    "label": "Ruanda",
    "labelCyr": "Руанда",
    "stations": [
      {
        "id": "st-nonres-rw",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Ruanda)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Руанда)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Ruanda",
      "Руанда"
    ]
  },
  {
    "countryCode": "RO",
    "label": "Rumunija",
    "labelCyr": "Румунија",
    "stations": [
      {
        "id": "st-ro-emb-main",
        "embassy": "Ambasada Republike Srbije (Rumunija)",
        "embassyCyr": "Амбасада Републике Србије (Румунија)",
        "email": "consulate.bucharest@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://bucharest.mfa.gov.rs",
        "address": "General Eremia Grigorescu nr. 12БукурештРумунија",
        "isResident": true
      },
      {
        "id": "st-ro-cons-temivar",
        "embassy": "Generalni konzulat Republike Srbije (Temišvar)",
        "embassyCyr": "Генерални конзулат Републике Србије (Темишвар)",
        "email": "srb.cons.timisoara@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://timisoara.mfa.gov.rs",
        "address": "Str.Remus No 4ТЕМИШВАРРУМУНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Rumunija",
      "Румунија"
    ]
  },
  {
    "countryCode": "RU",
    "label": "Rusija",
    "labelCyr": "Русија",
    "stations": [
      {
        "id": "st-ru-emb-main",
        "embassy": "Ambasada Republike Srbije (Rusija)",
        "embassyCyr": "Амбасада Републике Србије (Русија)",
        "email": "konzularno.moskva@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.moskva.mfa.gov.rs",
        "address": "Mosfiljmovskaja 46 R-119285 МОСКВА РУСКА ФЕДЕРАЦИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Rusija",
      "Русија"
    ]
  },
  {
    "countryCode": "WS",
    "label": "Samoa",
    "labelCyr": "Самоа",
    "stations": [
      {
        "id": "st-nonres-ws",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Samoa)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Самоа)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Samoa",
      "Самоа"
    ]
  },
  {
    "countryCode": "SM",
    "label": "San Marino",
    "labelCyr": "Сан Марино",
    "stations": [
      {
        "id": "st-nonres-sm",
        "embassy": "Ambasada Republike Srbije (Italija) (pokriva San Marino)",
        "embassyCyr": "Амбасада Републике Србије (Италија) (покрива Сан Марино)",
        "email": "srb.emb.italy@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://roma.mfa.gov.rs",
        "address": "Via dei Monti Parioli 2000197 РИМИТАЛИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "San Marino",
      "Сан Марино"
    ]
  },
  {
    "countryCode": "ST",
    "label": "Sao Tome i Prinsipe",
    "labelCyr": "Сао Томе и Принсипе",
    "stations": [
      {
        "id": "st-nonres-st",
        "embassy": "Ambasada Republike Srbije (Angola) (pokriva Sao Tome i Prinsipe)",
        "embassyCyr": "Амбасада Републике Србије (Ангола) (покрива Сао Томе и Принсипе)",
        "email": "srb.emb.angola@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://luanda.mfa.gov.rs",
        "address": "Comandante N'Zaji 25/27, AlvaladeЛУАНДААНГОЛА",
        "isResident": false
      }
    ],
    "aliases": [
      "Sao Tome i Prinsipe",
      "Сао Томе и Принсипе"
    ]
  },
  {
    "countryCode": "SA",
    "label": "Saudijska Arabija",
    "labelCyr": "Саудијска Арабија",
    "stations": [
      {
        "id": "st-sa-emb-main",
        "embassy": "Ambasada Republike Srbije (Saudijska Arabija)",
        "embassyCyr": "Амбасада Републике Србије (Саудијска Арабија)",
        "email": "srb.emb.saudiarabia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://riyadh.mfa.gov.rs",
        "address": "Abdulqader Al Jaza'eri Street,Building No.26РијадСаудијска Арабија",
        "isResident": true
      }
    ],
    "aliases": [
      "Saudijska Arabija",
      "Саудијска Арабија"
    ]
  },
  {
    "countryCode": "LC",
    "label": "Sveta Lucija",
    "labelCyr": "Света Луција",
    "stations": [
      {
        "id": "st-nonres-lc",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Sveta Lucija)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Света Луција)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Sveta Lucija",
      "Света Луција"
    ]
  },
  {
    "countryCode": "VC",
    "label": "Sveti Vinsent i Grenadini",
    "labelCyr": "Свети Винсент и Гренадини",
    "stations": [
      {
        "id": "st-nonres-vc",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Sveti Vinsent i Grenadini)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Свети Винсент и Гренадини)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Sveti Vinsent i Grenadini",
      "Свети Винсент и Гренадини"
    ]
  },
  {
    "countryCode": "KP",
    "label": "Severna Koreja",
    "labelCyr": "Северна Кореја",
    "stations": [
      {
        "id": "st-nonres-kp",
        "embassy": "Ambasada Republike Srbije (Kina) (pokriva Severna Koreja)",
        "embassyCyr": "Амбасада Републике Србије (Кина) (покрива Северна Кореја)",
        "email": "embserbia@embserbia.cn",
        "isElectionContactConfirmed": false,
        "website": "https://beijing.mfa.gov.rs",
        "address": "San Li Tun, Dong 6 Jie 1100600 ПЕКИНГН.Р. КИНА",
        "isResident": false
      }
    ],
    "aliases": [
      "Severna Koreja",
      "Северна Кореја"
    ]
  },
  {
    "countryCode": "MK",
    "label": "Severna Makedonija",
    "labelCyr": "Северна Македонија",
    "stations": [
      {
        "id": "st-mk-emb-main",
        "embassy": "Ambasada Republike Srbije (Severna Makedonija)",
        "embassyCyr": "Амбасада Републике Србије (Северна Македонија)",
        "email": "consulate.skopje@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://skopje.mfa.gov.rs",
        "address": "Самоилова бр. 34, СКОПЉЕСЕВЕРНА МАКЕДОНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Severna Makedonija",
      "Северна Македонија"
    ]
  },
  {
    "countryCode": "SC",
    "label": "Sejšeli",
    "labelCyr": "Сејшели",
    "stations": [
      {
        "id": "st-nonres-sc",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Sejšeli)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Сејшели)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Sejšeli",
      "Сејшели"
    ]
  },
  {
    "countryCode": "SN",
    "label": "Senegal",
    "labelCyr": "Сенегал",
    "stations": [
      {
        "id": "st-nonres-sn",
        "embassy": "Ambasada Republike Srbije (Maroko) (pokriva Senegal)",
        "embassyCyr": "Амбасада Републике Србије (Мароко) (покрива Сенегал)",
        "email": "ambrsrabat@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://rabat.mfa.gov.rs",
        "address": "24, Rue El Kadi Ahmed MoulineSouissiРАБАТМАРОКОB.P.5014",
        "isResident": false
      }
    ],
    "aliases": [
      "Senegal",
      "Сенегал"
    ]
  },
  {
    "countryCode": "KN",
    "label": "Sent Kits i Nevis",
    "labelCyr": "Сент Китс и Невис",
    "stations": [
      {
        "id": "st-nonres-kn",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Sent Kits i Nevis)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Сент Китс и Невис)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Sent Kits i Nevis",
      "Сент Китс и Невис"
    ]
  },
  {
    "countryCode": "SL",
    "label": "Sijera Leone",
    "labelCyr": "Сијера Леоне",
    "stations": [
      {
        "id": "st-nonres-sl",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Sijera Leone)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Сијера Леоне)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Sijera Leone",
      "Сијера Леоне"
    ]
  },
  {
    "countryCode": "SG",
    "label": "Singapur",
    "labelCyr": "Сингапур",
    "stations": [
      {
        "id": "st-nonres-sg",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Singapur)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Сингапур)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Singapur",
      "Сингапур"
    ]
  },
  {
    "countryCode": "SY",
    "label": "Sirija",
    "labelCyr": "Сирија",
    "stations": [
      {
        "id": "st-sy-emb-main",
        "embassy": "Ambasada Republike Srbije (Sirija)",
        "embassyCyr": "Амбасада Републике Србије (Сирија)",
        "email": "srb.emb.syria@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://damascus.mfa.gov.rs",
        "address": "Mazzeh Eastern Villas, Farabi Street,Damascus,Syria",
        "isResident": true
      }
    ],
    "aliases": [
      "Sirija",
      "Сирија"
    ]
  },
  {
    "countryCode": "US",
    "label": "SAD",
    "labelCyr": "Сједињене Америчке Државе",
    "stations": [
      {
        "id": "st-us-emb-main",
        "embassy": "Ambasada Republike Srbije (SAD)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": true
      },
      {
        "id": "st-us-cons-ikago",
        "embassy": "Generalni konzulat Republike Srbije (Čikago)",
        "embassyCyr": "Генерални конзулат Републике Србије (Чикаго)",
        "email": "srb.cons.chicago@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://chicago.mfa.gov.rs",
        "address": "201 East Ohio Street, Suite 200ЧИКАГО, IL 60611, САД",
        "isResident": true
      },
      {
        "id": "st-us-cons-njujork",
        "embassy": "Generalni konzulat Republike Srbije (Njujork)",
        "embassyCyr": "Генерални конзулат Републике Србије (Њујорк)",
        "email": "consulate.newyork@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://newyork.mfa.gov.rs",
        "address": "62 West 45th Street, 7 Floor,ЊУЈОРК, NY 10036, САД",
        "isResident": true
      }
    ],
    "aliases": [
      "America",
      "Amerika",
      "SAD",
      "Sjedinjene Americke Drzave",
      "Sjedinjene Američke Države",
      "USA",
      "United States",
      "United States of America",
      "Америка",
      "САД",
      "Сједињене Америчке Државе",
      "УСА"
    ]
  },
  {
    "countryCode": "SK",
    "label": "Slovačka",
    "labelCyr": "Словачка",
    "stations": [
      {
        "id": "st-sk-emb-main",
        "embassy": "Ambasada Republike Srbije (Slovačka)",
        "embassyCyr": "Амбасада Републике Србије (Словачка)",
        "email": "embassy.bratislava@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.bratislava.mfa.gov.rs",
        "address": "Budkova 38 81104 БРАТИСЛАВА СЛОВАЧКА РЕПУБЛИКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Slovačka",
      "Словачка"
    ]
  },
  {
    "countryCode": "SI",
    "label": "Slovenija",
    "labelCyr": "Словенија",
    "stations": [
      {
        "id": "st-si-emb-main",
        "embassy": "Ambasada Republike Srbije (Slovenija)",
        "embassyCyr": "Амбасада Републике Србије (Словенија)",
        "email": "embassy.ljubljana@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://ljubljana.mfa.gov.rs",
        "address": "Ciril - Metodov trg 1 1000 ЉУБЉАНА СЛОВЕНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Slovenija",
      "Словенија"
    ]
  },
  {
    "countryCode": "SB",
    "label": "Solomonova Ostrva",
    "labelCyr": "Соломонова Острва",
    "stations": [
      {
        "id": "st-nonres-sb",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Solomonova Ostrva)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Соломонова Острва)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Solomonova Ostrva",
      "Соломонова Острва"
    ]
  },
  {
    "countryCode": "SO",
    "label": "Somalija",
    "labelCyr": "Сомалија",
    "stations": [
      {
        "id": "st-nonres-so",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Somalija)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Сомалија)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Somalija",
      "Сомалија"
    ]
  },
  {
    "countryCode": "SMOM",
    "label": "Suvereni Malteški Red",
    "labelCyr": "Суверени Малтешки Ред",
    "stations": [
      {
        "id": "st-nonres-smom",
        "embassy": "Ambasada Republike Srbije (Vatikan) (pokriva Suvereni Malteški Red)",
        "embassyCyr": "Амбасада Републике Србије (Ватикан (Света Столица)) (покрива Суверени Малтешки Ред)",
        "email": "amb.serbia.vatican@ambroma.com",
        "isElectionContactConfirmed": false,
        "website": "https://vatican.mfa.gov.rs",
        "address": "Via dei Monti Parioli 2000197 РИМВАТИКАН",
        "isResident": false
      }
    ],
    "aliases": [
      "Suvereni Malteški Red",
      "Суверени Малтешки Ред"
    ]
  },
  {
    "countryCode": "SD",
    "label": "Sudan",
    "labelCyr": "Судан",
    "stations": [
      {
        "id": "st-nonres-sd",
        "embassy": "Ambasada Republike Srbije (Egipat) (pokriva Sudan)",
        "embassyCyr": "Амбасада Републике Србије (Египат) (покрива Судан)",
        "email": "serbia@serbiaeg.comkonzul",
        "isElectionContactConfirmed": false,
        "website": "https://cairo.mfa.gov.rs",
        "address": "33, Al Mansour Mohamed St.,ZAMALEKКАИРОЕГИПАТ",
        "isResident": false
      }
    ],
    "aliases": [
      "Sudan",
      "Судан"
    ]
  },
  {
    "countryCode": "SR",
    "label": "Surinam",
    "labelCyr": "Суринам",
    "stations": [
      {
        "id": "st-nonres-sr",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Surinam)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Суринам)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Surinam",
      "Суринам"
    ]
  },
  {
    "countryCode": "TH",
    "label": "Tajland",
    "labelCyr": "Тајланд",
    "stations": [
      {
        "id": "st-nonres-th",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Tajland)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Тајланд)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Tajland",
      "Тајланд"
    ]
  },
  {
    "countryCode": "TZ",
    "label": "Tanzanija",
    "labelCyr": "Танзанија",
    "stations": [
      {
        "id": "st-tz-emb-main",
        "embassy": "Ambasada Republike Srbije (Tanzanija)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Tanzanija",
      "Танзанија"
    ]
  },
  {
    "countryCode": "TJ",
    "label": "Tadžikistan",
    "labelCyr": "Таџикистан",
    "stations": [
      {
        "id": "st-nonres-tj",
        "embassy": "Ambasada Republike Srbije (Rusija) (pokriva Tadžikistan)",
        "embassyCyr": "Амбасада Републике Србије (Русија) (покрива Таџикистан)",
        "email": "konzularno.moskva@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.moskva.mfa.gov.rs",
        "address": "Mosfiljmovskaja 46 R-119285 МОСКВА РУСКА ФЕДЕРАЦИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Tadžikistan",
      "Таџикистан"
    ]
  },
  {
    "countryCode": "TG",
    "label": "Togo",
    "labelCyr": "Того",
    "stations": [
      {
        "id": "st-nonres-tg",
        "embassy": "Ambasada Republike Srbije (Nigerija) (pokriva Togo)",
        "embassyCyr": "Амбасада Републике Србије (Нигерија) (покрива Того)",
        "email": "serbconsabuja@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://abuja.mfa.gov.rs",
        "address": "11, Rio Negro Close, off Yedseram StreetMaitama DistrictАБУЏАНИГЕРИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Togo",
      "Того"
    ]
  },
  {
    "countryCode": "TO",
    "label": "Tonga",
    "labelCyr": "Тонга",
    "stations": [
      {
        "id": "st-nonres-to",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Tonga)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Тонга)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Tonga",
      "Тонга"
    ]
  },
  {
    "countryCode": "TT",
    "label": "Trinidad i Tobago",
    "labelCyr": "Тринидад и Тобаго",
    "stations": [
      {
        "id": "st-nonres-tt",
        "embassy": "Ambasada Republike Srbije (SAD) (pokriva Trinidad i Tobago)",
        "embassyCyr": "Амбасада Републике Србије (Сједињене Америчке Државе) (покрива Тринидад и Тобаго)",
        "email": "izbori@serbiaembusa.org",
        "isElectionContactConfirmed": true,
        "website": "https://washington.mfa.gov.rs",
        "address": "1333 16th St NWВашингтон,DC 20036",
        "isResident": false
      }
    ],
    "aliases": [
      "Trinidad i Tobago",
      "Тринидад и Тобаго"
    ]
  },
  {
    "countryCode": "TV",
    "label": "Tuvalu",
    "labelCyr": "Тувалу",
    "stations": [
      {
        "id": "st-nonres-tv",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Tuvalu)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Тувалу)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Tuvalu",
      "Тувалу"
    ]
  },
  {
    "countryCode": "TN",
    "label": "Tunis",
    "labelCyr": "Тунис",
    "stations": [
      {
        "id": "st-tn-emb-main",
        "embassy": "Ambasada Republike Srbije (Tunis)",
        "embassyCyr": "Амбасада Републике Србије (Тунис)",
        "email": "amb.serbia@gnet.tn",
        "isElectionContactConfirmed": false,
        "website": "https://www.tunis.mfa.gov.rs",
        "address": "4, Rue du Lac Majeur, 1053 - Les Berges du Lac ТУНИС",
        "isResident": true
      }
    ],
    "aliases": [
      "Tunis",
      "Тунис"
    ]
  },
  {
    "countryCode": "TM",
    "label": "Turkmenistan",
    "labelCyr": "Туркменистан",
    "stations": [
      {
        "id": "st-nonres-tm",
        "embassy": "Ambasada Republike Srbije (Rusija) (pokriva Turkmenistan)",
        "embassyCyr": "Амбасада Републике Србије (Русија) (покрива Туркменистан)",
        "email": "konzularno.moskva@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.moskva.mfa.gov.rs",
        "address": "Mosfiljmovskaja 46 R-119285 МОСКВА РУСКА ФЕДЕРАЦИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Turkmenistan",
      "Туркменистан"
    ]
  },
  {
    "countryCode": "TR",
    "label": "Turska",
    "labelCyr": "Турска",
    "stations": [
      {
        "id": "st-tr-emb-main",
        "embassy": "Ambasada Republike Srbije (Turska)",
        "embassyCyr": "Амбасада Републике Србије (Турска)",
        "email": "embserank@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://ankara.mfa.gov.rs",
        "address": "Амбасада Републике СрбијеYazanlar Sokak No. 1P.K.2806691 KavaklidereАнкараТурска",
        "isResident": true
      },
      {
        "id": "st-tr-cons-istanbul",
        "embassy": "Generalni konzulat Republike Srbije (Istanbul)",
        "embassyCyr": "Генерални конзулат Републике Србије (Истанбул)",
        "email": "konzulat.istanbul@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://istanbul.mfa.gov.rs",
        "address": "Sümbül Sk. No: 2,Levent Mah. Besiktas,34330 Istanbul, Turkey",
        "isResident": true
      }
    ],
    "aliases": [
      "Turska",
      "Турска"
    ]
  },
  {
    "countryCode": "UG",
    "label": "Uganda",
    "labelCyr": "Уганда",
    "stations": [
      {
        "id": "st-nonres-ug",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Uganda)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Уганда)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Uganda",
      "Уганда"
    ]
  },
  {
    "countryCode": "UZ",
    "label": "Uzbekistan",
    "labelCyr": "Узбекистан",
    "stations": [
      {
        "id": "st-nonres-uz",
        "embassy": "Ambasada Republike Srbije (Rusija) (pokriva Uzbekistan)",
        "embassyCyr": "Амбасада Републике Србије (Русија) (покрива Узбекистан)",
        "email": "konzularno.moskva@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.moskva.mfa.gov.rs",
        "address": "Mosfiljmovskaja 46 R-119285 МОСКВА РУСКА ФЕДЕРАЦИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Uzbekistan",
      "Узбекистан"
    ]
  },
  {
    "countryCode": "AE",
    "label": "Ujedinjeni Arapski Emirati",
    "labelCyr": "Уједињени Арапски Емирати",
    "stations": [
      {
        "id": "st-ae-emb-main",
        "embassy": "Ambasada Republike Srbije (Ujedinjeni Arapski Emirati)",
        "embassyCyr": "Амбасада Републике Србије (Уједињени Арапски Емирати)",
        "email": "srb.emb.uae@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://abudhabi.mfa.gov.rs",
        "address": "Mushref area, sector W31Al Rafee streetVilla number 06(opposite of Novotel hotel)АБУ ДАБИУЈЕДИЊЕНИ АРАПСКИ ЕМИРАТИ",
        "isResident": true
      }
    ],
    "aliases": [
      "Ujedinjeni Arapski Emirati",
      "Уједињени Арапски Емирати"
    ]
  },
  {
    "countryCode": "GB",
    "label": "Ujedinjeno Kraljevstvo",
    "labelCyr": "Уједињено Краљевство",
    "stations": [
      {
        "id": "st-gb-emb-main",
        "embassy": "Ambasada Republike Srbije (Ujedinjeno Kraljevstvo)",
        "embassyCyr": "Амбасада Републике Србије (Уједињено Краљевство)",
        "email": "izbori.london@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://www.london.mfa.gov.rs",
        "address": "28 Belgrave Square ЛОНДОН SW1X 8QB ВЕЛИКА БРИТАНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Ujedinjeno Kraljevstvo",
      "Уједињено Краљевство"
    ]
  },
  {
    "countryCode": "UA",
    "label": "Ukrajina",
    "labelCyr": "Украјина",
    "stations": [
      {
        "id": "st-ua-emb-main",
        "embassy": "Ambasada Republike Srbije (Ukrajina)",
        "embassyCyr": "Амбасада Републике Србије (Украјина)",
        "email": "ambars@ukr.net",
        "isElectionContactConfirmed": false,
        "website": "https://kiev.mfa.gov.rs",
        "address": "Улица Богдана Хмељницког 48, трећи спрат01045 КИЈЕВУКРАЈИНА",
        "isResident": true
      }
    ],
    "aliases": [
      "Ukrajina",
      "Украјина"
    ]
  },
  {
    "countryCode": "KM",
    "label": "Unija Komora",
    "labelCyr": "Унија Комора",
    "stations": [
      {
        "id": "st-nonres-km",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Unija Komora)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Унија Комора)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Unija Komora",
      "Унија Комора"
    ]
  },
  {
    "countryCode": "UY",
    "label": "Urugvaj",
    "labelCyr": "Уругвај",
    "stations": [
      {
        "id": "st-nonres-uy",
        "embassy": "Ambasada Republike Srbije (Argentina) (pokriva Urugvaj)",
        "embassyCyr": "Амбасада Републике Србије (Аргентина) (покрива Уругвај)",
        "email": "consulado.argentina@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://buenosaires.mfa.gov.rs",
        "address": "Montevideo 696 1019 BUENOS AIRES ARGENTINE",
        "isResident": false
      }
    ],
    "aliases": [
      "Urugvaj",
      "Уругвај"
    ]
  },
  {
    "countryCode": "PH",
    "label": "Filipini",
    "labelCyr": "Филипини",
    "stations": [
      {
        "id": "st-nonres-ph",
        "embassy": "Ambasada Republike Srbije (Indonezija) (pokriva Filipini)",
        "embassyCyr": "Амбасада Републике Србије (Индонезија) (покрива Филипини)",
        "email": "consular.jakarta@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://jakarta.mfa.gov.rs",
        "address": "Jl. HOS Cokroaminoto 109,Menteng 10310ЏАКАРТА ПУСАТИНДОНЕЗИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Filipini",
      "Филипини"
    ]
  },
  {
    "countryCode": "FI",
    "label": "Finska",
    "labelCyr": "Финска",
    "stations": [
      {
        "id": "st-fi-emb-main",
        "embassy": "Ambasada Republike Srbije (Finska)",
        "embassyCyr": "Амбасада Републике Србије (Финска)",
        "email": "info@serbianembassy.fi",
        "isElectionContactConfirmed": true,
        "website": "https://helsinki.mfa.gov.rs",
        "address": "Kulosaarentie 3600570 ХЕЛСИНКИФИНСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Finska",
      "Финска"
    ]
  },
  {
    "countryCode": "FJ",
    "label": "Fidži",
    "labelCyr": "Фиџи",
    "stations": [
      {
        "id": "st-nonres-fj",
        "embassy": "Ambasada Republike Srbije (Australija) (pokriva Fidži)",
        "embassyCyr": "Амбасада Републике Србије (Аустралија) (покрива Фиџи)",
        "email": "srb.emb.australia@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://canberra.mfa.gov.rs",
        "address": "4 Bulwara CloseO'Malley, ACT 2606Канбера, Аустралија",
        "isResident": false
      }
    ],
    "aliases": [
      "Fidži",
      "Фиџи"
    ]
  },
  {
    "countryCode": "FR",
    "label": "Francuska",
    "labelCyr": "Француска",
    "stations": [
      {
        "id": "st-fr-emb-main-paris-mfa-gov-rs",
        "embassy": "Ambasada Republike Srbije (Francuska)",
        "embassyCyr": "Амбасада Републике Србије (Француска)",
        "email": "ambassade.paris@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.paris.mfa.gov.rs",
        "address": "5, Rue Leonard de Vinci 75116 ПАРИЗ ФРАНЦУСКА",
        "isResident": true
      },
      {
        "id": "st-fr-emb-main-info",
        "embassy": "Ambasada Republike Srbije (Francuska)",
        "embassyCyr": "Амбасада Републике Србије (Француска)",
        "email": "info@ccserbie.com",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "123, Rue St Martin 75004 ПАРИЗ ФРАНЦУСКА",
        "isResident": true
      },
      {
        "id": "st-fr-cons-strazbur",
        "embassy": "Generalni konzulat Republike Srbije (Strazbur)",
        "embassyCyr": "Генерални конзулат Републике Србије (Стразбур)",
        "email": "consulate.strasbourg@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.strasbourg.mfa.gov.rs",
        "address": "26, Avenue de la Forêt Noire 67000 СТРАЗБУР ФРАНЦУСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Francuska",
      "Француска"
    ]
  },
  {
    "countryCode": "HT",
    "label": "Haiti",
    "labelCyr": "Хаити",
    "stations": [
      {
        "id": "st-nonres-ht",
        "embassy": "Ambasada Republike Srbije (Kuba) (pokriva Haiti)",
        "embassyCyr": "Амбасада Републике Србије (Куба) (покрива Хаити)",
        "email": "officesrbhav@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://havana.mfa.gov.rs",
        "address": "5ta Avenida, No. 4406, entre 44 y 46,Miramar Playa,ХАВАНА,КУБА",
        "isResident": false
      }
    ],
    "aliases": [
      "Haiti",
      "Хаити"
    ]
  },
  {
    "countryCode": "NL",
    "label": "Holandija",
    "labelCyr": "Холандија",
    "stations": [
      {
        "id": "st-nl-emb-main",
        "embassy": "Ambasada Republike Srbije (Holandija)",
        "embassyCyr": "Амбасада Републике Србије (Холандија)",
        "email": "konzularno.hag@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://thehague.mfa.gov.rs",
        "address": "Burgemeester van Karnebeeklaan 192585 ХАГ ХОЛАНДИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Holandija",
      "Холандија"
    ]
  },
  {
    "countryCode": "HN",
    "label": "Honduras",
    "labelCyr": "Хондурас",
    "stations": [
      {
        "id": "st-nonres-hn",
        "embassy": "Ambasada Republike Srbije (Meksiko) (pokriva Honduras)",
        "embassyCyr": "Амбасада Републике Србије (Мексико) (покрива Хондурас)",
        "email": "embajadaserbiaenmexico@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://mexico.mfa.gov.rs",
        "address": "Av. Montanas Rocallosas No.515Lomas de Chapultepec11000 МЕКСИКО, Д.Ф.МЕКСИКО",
        "isResident": false
      }
    ],
    "aliases": [
      "Honduras",
      "Хондурас"
    ]
  },
  {
    "countryCode": "HR",
    "label": "Hrvatska",
    "labelCyr": "Хрватска",
    "stations": [
      {
        "id": "st-hr-emb-main",
        "embassy": "Ambasada Republike Srbije (Hrvatska)",
        "embassyCyr": "Амбасада Републике Србије (Хрватска)",
        "email": "konzularno.zagreb@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://zagreb.mfa.gov.rs",
        "address": "Јабуковац 2310000 ЗАГРЕБРЕПУБЛИКА ХРВАТСКА",
        "isResident": true
      },
      {
        "id": "st-hr-cons-rijeka",
        "embassy": "Generalni konzulat Republike Srbije (Rijeka)",
        "embassyCyr": "Генерални конзулат Републике Србије (Ријека)",
        "email": "konzulat.srbije.rijeka@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://rijeka.mfa.gov.rs",
        "address": "Еразма Барчића 951000 РИЈЕКАХРВАТСКА",
        "isResident": true
      },
      {
        "id": "st-hr-cons-vukovar",
        "embassy": "Generalni konzulat Republike Srbije (Vukovar)",
        "embassyCyr": "Генерални конзулат Републике Србије (Вуковар)",
        "email": "generalni.konzulat@gk-srbije-vukovar.hr",
        "isElectionContactConfirmed": false,
        "website": "https://vukovar.mfa.gov.rs",
        "address": "Ивана Гундулића 19ВУКОВАРХРВАТСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Hrvatska",
      "Хрватска"
    ]
  },
  {
    "countryCode": "CF",
    "label": "Centralnoafrička Republika",
    "labelCyr": "Централноафричка Република",
    "stations": [
      {
        "id": "st-nonres-cf",
        "embassy": "Ambasada Republike Srbije (Demokratska Republika Kongo) (pokriva Centralnoafrička Republika)",
        "embassyCyr": "Амбасада Републике Србије (Демократска Република Конго) (покрива Централноафричка Република)",
        "email": "serbambakin@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://kinshasa.mfa.gov.rs",
        "address": "Avenue de 1 Etoile 112,Gombe, КИНШАСА, КОНГО, ДР",
        "isResident": false
      }
    ],
    "aliases": [
      "Centralnoafrička Republika",
      "Централноафричка Република"
    ]
  },
  {
    "countryCode": "ME",
    "label": "Crna Gora",
    "labelCyr": "Црна Гора",
    "stations": [
      {
        "id": "st-me-emb-main",
        "embassy": "Ambasada Republike Srbije (Crna Gora)",
        "embassyCyr": "Амбасада Републике Србије (Црна Гора)",
        "email": "embassy.podgorica@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://podgorica.mfa.gov.rs",
        "address": "Булевар Ивана Црнојевића бр. 10,ПОДГОРИЦАЦРНА ГОРА",
        "isResident": true
      },
      {
        "id": "st-me-cons-hercegnovi",
        "embassy": "Generalni konzulat Republike Srbije (Herceg Novi)",
        "embassyCyr": "Генерални конзулат Републике Србије (Херцег Нови)",
        "email": "gkh.novi@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://hercegnovi.mfa.gov.rs",
        "address": "Trg Hercega Stjepana (Belavista) 1585340 ХЕРЦЕГ НОВИЦРНА ГОРА",
        "isResident": true
      }
    ],
    "aliases": [
      "Crna Gora",
      "Црна Гора"
    ]
  },
  {
    "countryCode": "TD",
    "label": "Čad",
    "labelCyr": "Чад",
    "stations": [
      {
        "id": "st-nonres-td",
        "embassy": "Ambasada Republike Srbije (Demokratska Republika Kongo) (pokriva Čad)",
        "embassyCyr": "Амбасада Републике Србије (Демократска Република Конго) (покрива Чад)",
        "email": "serbambakin@gmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://kinshasa.mfa.gov.rs",
        "address": "Avenue de 1 Etoile 112,Gombe, КИНШАСА, КОНГО, ДР",
        "isResident": false
      }
    ],
    "aliases": [
      "Čad",
      "Чад"
    ]
  },
  {
    "countryCode": "CZ",
    "label": "Češka",
    "labelCyr": "Чешка",
    "stations": [
      {
        "id": "st-cz-emb-main",
        "embassy": "Ambasada Republike Srbije (Češka)",
        "embassyCyr": "Амбасада Републике Србије (Чешка)",
        "email": "embassy.prague@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.prague.mfa.gov.rs",
        "address": "118 00 ПРАГ 1, Mostecka 15 ЧЕШКА РЕПУБЛИКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Češka",
      "Чешка"
    ]
  },
  {
    "countryCode": "CL",
    "label": "Čile",
    "labelCyr": "Чиле",
    "stations": [
      {
        "id": "st-cl-emb-main",
        "embassy": "Ambasada Republike Srbije (Čile)",
        "embassyCyr": "Амбасада Републике Србије (Чиле)",
        "email": "srb.emb.chile@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "",
        "address": "",
        "isResident": true
      }
    ],
    "aliases": [
      "Čile",
      "Чиле"
    ]
  },
  {
    "countryCode": "DJ",
    "label": "Džibuti",
    "labelCyr": "Џибути",
    "stations": [
      {
        "id": "st-nonres-dj",
        "embassy": "Ambasada Republike Srbije (Tanzanija) (pokriva Džibuti)",
        "embassyCyr": "Амбасада Републике Србије (Танзанија) (покрива Џибути)",
        "email": "srb.emb.kenya@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://nairobi.mfa.gov.rs",
        "address": "Fortis Tower, Woodvale Grove, 6th floor,00100 НАЈРОБИ,КЕНИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Džibuti",
      "Џибути"
    ]
  },
  {
    "countryCode": "CH",
    "label": "Švajcarska",
    "labelCyr": "Швајцарска",
    "stations": [
      {
        "id": "st-ch-emb-main",
        "embassy": "Ambasada Republike Srbije (Švajcarska)",
        "embassyCyr": "Амбасада Републике Србије (Швајцарска)",
        "email": "info@ambasadasrbije.ch",
        "isElectionContactConfirmed": false,
        "website": "https://berne.mfa.gov.rs",
        "address": "Seminarstrasse 5CH-3006 БЕРНШВАЈЦАРСКА",
        "isResident": true
      },
      {
        "id": "st-ch-cons-cirih",
        "embassy": "Generalni konzulat Republike Srbije (Cirih)",
        "embassyCyr": "Генерални конзулат Републике Србије (Цирих)",
        "email": "srb.cons.zurich@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://www.zurich.mfa.gov.rs",
        "address": "Alfred-Escher-Strasse 4, 8002 ЦИРИХ ШВАЈЦАРСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Švajcarska",
      "Швајцарска"
    ]
  },
  {
    "countryCode": "SE",
    "label": "Švedska",
    "labelCyr": "Шведска",
    "stations": [
      {
        "id": "st-se-emb-main",
        "embassy": "Ambasada Republike Srbije (Švedska)",
        "embassyCyr": "Амбасада Републике Србије (Шведска)",
        "email": "srb.emb.sweden@mfa.rs",
        "isElectionContactConfirmed": false,
        "website": "https://stockholm.mfa.gov.rs",
        "address": "Hantverkargatan 26,3rd floorBox 529 101 30СТОКХОЛМШВЕДСКА",
        "isResident": true
      }
    ],
    "aliases": [
      "Švedska",
      "Шведска"
    ]
  },
  {
    "countryCode": "ES",
    "label": "Španija",
    "labelCyr": "Шпанија",
    "stations": [
      {
        "id": "st-es-emb-main",
        "embassy": "Ambasada Republike Srbije (Španija)",
        "embassyCyr": "Амбасада Републике Србије (Шпанија)",
        "email": "konz.madrid@mfa.rs",
        "isElectionContactConfirmed": true,
        "website": "https://madrid.mfa.gov.rs",
        "address": "c/Velazquez 3, Piso 228001 МАДРИДШПАНИЈА",
        "isResident": true
      }
    ],
    "aliases": [
      "Španija",
      "Шпанија"
    ]
  },
  {
    "countryCode": "LK",
    "label": "Šri Lanka",
    "labelCyr": "Шри Ланка",
    "stations": [
      {
        "id": "st-nonres-lk",
        "embassy": "Ambasada Republike Srbije (Indija) (pokriva Šri Lanka)",
        "embassyCyr": "Амбасада Републике Србије (Индија) (покрива Шри Ланка)",
        "email": "embassyofserbiadelhi@hotmail.com",
        "isElectionContactConfirmed": false,
        "website": "https://newdelhi.mfa.gov.rs",
        "address": "3/50 G Niti Marg Chanakyapuri110021 ЊУ ДЕЛХИИНДИЈА",
        "isResident": false
      }
    ],
    "aliases": [
      "Šri Lanka",
      "Шри Ланка"
    ]
  }
];

export const COUNTRY_BY_CODE = new Map<string, VotingCountry>(
  COUNTRIES.map((c) => [c.countryCode, c])
);
