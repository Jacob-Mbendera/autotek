# Product Fitment — Sample Test Data

Copy these into Admin → Products / Request a part when manually testing Phases 1–3.

Clear `localStorage` key `autotek.selectedVehicle` if an old vehicle filter sticks.

---

## Products

```json
{
  "products": [
    {
      "id": "A",
      "name": "Front Brake Pads – Hilux",
      "brand": "Bosch",
      "oemPartNumber": "04465-0K160",
      "alternatePartNumbers": ["BP1423", "GDB3284"],
      "isUniversal": false,
      "fitmentStatus": "verified",
      "compatibility": [
        {
          "make": "Toyota",
          "model": "Hilux",
          "yearFrom": 2016,
          "yearTo": 2023,
          "engine": "2.4 GD",
          "notes": "Front axle"
        }
      ]
    },
    {
      "id": "B",
      "name": "Oil Filter – Corolla",
      "brand": "Toyota Genuine",
      "oemPartNumber": "90915-YZZD3",
      "alternatePartNumbers": [],
      "isUniversal": false,
      "fitmentStatus": "partial",
      "compatibility": [
        {
          "make": "Toyota",
          "model": "Corolla",
          "yearFrom": 2014,
          "yearTo": 2019,
          "engine": "1.6",
          "notes": ""
        }
      ]
    },
    {
      "id": "C",
      "name": "Multigrade Engine Oil 5W-30 4L",
      "brand": "Castrol",
      "oemPartNumber": "",
      "alternatePartNumbers": [],
      "isUniversal": true,
      "fitmentStatus": "none",
      "compatibility": []
    },
    {
      "id": "D",
      "name": "Generic Cabin Filter (no fitment)",
      "brand": "",
      "oemPartNumber": "",
      "alternatePartNumbers": [],
      "isUniversal": false,
      "fitmentStatus": "none",
      "compatibility": []
    }
  ]
}
```

---

## Shop-by-vehicle checks

```json
{
  "shopByVehicleChecks": [
    {
      "filter": { "make": "Toyota", "model": "Hilux", "year": 2018 },
      "expectProductIds": ["A"],
      "expectUniversalIfIncluded": ["C"],
      "notes": "A matches year range; C only if include universal is on"
    },
    {
      "filter": { "make": "Toyota", "model": "Corolla", "year": 2016 },
      "expectProductIds": ["B"],
      "expectUniversalIfIncluded": ["C"],
      "notes": "B matches; C if universal included"
    },
    {
      "filter": { "make": "Toyota", "model": "Hilux", "year": 2010 },
      "expectProductIds": [],
      "expectUniversalIfIncluded": ["C"],
      "notes": "A should NOT match year range"
    },
    {
      "filter": { "make": "Nissan", "model": "X-Trail", "year": 2020 },
      "expectProductIds": [],
      "expectUniversalIfIncluded": ["C"],
      "notes": "Neither A nor B"
    }
  ]
}
```

---

## Request-a-part / catalog suggestions

```json
{
  "partRequestChecks": [
    {
      "id": "strong-oem-match",
      "vehicle": {
        "make": "Toyota",
        "model": "Hilux",
        "year": 2019,
        "engine": "2.4 GD"
      },
      "partName": "brake pads",
      "oemOrPartNumber": "04465-0K160",
      "expectTopSuggestionId": "A",
      "notes": "Vehicle + OEM should rank Product A high"
    },
    {
      "id": "vehicle-only-match",
      "vehicle": {
        "make": "Toyota",
        "model": "Corolla",
        "year": 2017,
        "engine": "1.6"
      },
      "partName": "oil filter",
      "oemOrPartNumber": "",
      "expectTopSuggestionId": "B",
      "notes": "Vehicle fit should surface Product B"
    },
    {
      "id": "no-catalog-match",
      "vehicle": {
        "make": "Mazda",
        "model": "Demio",
        "year": 2015,
        "engine": ""
      },
      "partName": "timing belt",
      "oemOrPartNumber": "",
      "expectTopSuggestionId": null,
      "notes": "Empty or weak suggestions; empty-state Request a part still works"
    }
  ]
}
```

---

## Quick smoke order

```json
{
  "smokeOrder": [
    "Create products A, B, C, D in Admin → Products",
    "Products page → filter Toyota / Hilux / 2018 → see A",
    "Open product A → fitment shows Toyota Hilux 2016–2023",
    "Request a part with strong-oem-match → suggestions show A",
    "Admin → Custom Orders on that request → same suggestion panel"
  ]
}
```
