import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-09-04";

if (!projectId || !dataset || !token) {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_API_WRITE_TOKEN are required",
  );
}

const client = createClient({ projectId, dataset, token, apiVersion, useCdn: false });

const topLevelCategories = [
  "Development Boards",
  "DIY & Maker Kits",
  "3D Printers and Parts",
  "Drone Parts",
  "Sensors",
  "Mechanical Parts & Measurement Tools",
  "Electronic Modules and Displays",
  "IoT and Wireless Modules",
  "Electronic Components",
  "Batteries, Power Supply & Accessories",
  "Motors | Drivers | Pumps | Actuators",
  "Educational Trainer Kits",
];

const sensorSubcategories = [
  "Temperature Sensors & Probes",
  "Environment Sensors",
  "Sensor Modules",
  "Electrical Sensors",
  "Distance Sensors",
  "RFID Card/Tags & Reader",
  "Ultrasonic Sensors & Modules",
  "Barcode Scanners",
  "Biometric/Fingerprint Sensor",
  "Vibration/Tilt Sensor",
  "Flow Sensors",
  "Level Sensors",
  "Smart IoT Sensors",
  "Humidity Sensors",
  "Pressure Transducers & Transmitters",
  "Pressure Sensor",
  "Force and Flex Film Sensors",
  "PIR/IR and Optical Sensor",
  "Photoelectric Sensor",
  "Color Sensors",
  "Proximity Sensor",
  "Line Sensor",
  "Gas Sensor",
  "Rotary Encoder",
  "IMU/Accelerometer/Magnetometer & Gyroscope",
  "Flame Sensors",
  "ECG/EMG & Heart Rate Sensors",
  "Load Sensor",
  "Hall Sensor",
  "Thermoelectric Peltier Elements",
];

const thirdLevelCategories = {
  "Temperature Sensors & Probes": [
    "Thermostats",
    "Temperature Sensor Probes",
    "Temperature Sensor Modules",
    "Temperature & Humidity ICs",
    "Thermistors",
    "Thermocouples",
  ],
  "Environment Sensors": [
    "Rain Sensors",
    "Air Quality Sensor",
    "Soil Moisture Sensors",
    "Water Quality Sensors",
    "Wind Speed & Direction Sensors",
  ],
  "Sensor Modules": [
    "ACEBOTT Modules",
    "Light Sensor Module",
    "Sound Sensor Modules",
  ],
  "Electrical Sensors": ["Voltage Sensor", "Current Sensor", "Power Sensor"],
  "Distance Sensors": ["Laser Distance Sensors", "IR & ToF Distance Sensors"],
  "RFID Card/Tags & Reader": ["RFID Readers and Writers", "RFID Tags & Cards"],
  "Ultrasonic Sensors & Modules": [
    "Multi-Brand Ultrasonic Sensors",
    "Ultrasonic Humidifier Module",
  ],
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureCategory(title, parentId) {
  const slug = slugify(title);
  const existing = await client.fetch(
    `*[_type == "category" && slug.current == $slug][0]{_id, "parentId": parentCategory._ref}`,
    { slug },
  );

  if (existing) {
    if ((existing.parentId ?? null) !== (parentId ?? null)) {
      const patch = client.patch(existing._id);
      if (parentId) {
        patch.set({ parentCategory: { _type: "reference", _ref: parentId } });
      } else {
        patch.unset(["parentCategory"]);
      }
      await patch.commit();
    }
    return existing._id;
  }

  const document = await client.create({
    _type: "category",
    title,
    slug: { _type: "slug", current: slug },
    ...(parentId
      ? { parentCategory: { _type: "reference", _ref: parentId } }
      : {}),
  });
  return document._id;
}

async function ensureBrand(title) {
  const slug = slugify(title);
  const existingId = await client.fetch(
    `*[_type == "brand" && slug.current == $slug][0]._id`,
    { slug },
  );
  if (existingId) return existingId;
  return (await client.create({
    _type: "brand",
    title,
    slug: { _type: "slug", current: slug },
  }))._id;
}

const categoryIds = new Map();
for (const title of topLevelCategories) {
  categoryIds.set(title, await ensureCategory(title, null));
}

const sensorsId = categoryIds.get("Sensors");
for (const title of sensorSubcategories) {
  categoryIds.set(title, await ensureCategory(title, sensorsId));
}

for (const [parentTitle, children] of Object.entries(thirdLevelCategories)) {
  const parentId = categoryIds.get(parentTitle);
  for (const title of children) {
    await ensureCategory(title, parentId);
  }
}

await ensureBrand("TESCA");
console.log("Catalog seed complete.");
