import { db, usersTable, turfsTable, timeSlotsTable, eventsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.email, "admin@vsysports.com"));
  let adminId: number;
  if (existingAdmin.length > 0) {
    adminId = existingAdmin[0].id;
    console.log("Admin user already exists");
  } else {
    const hash = await bcrypt.hash("Admin@123", 10);
    const [admin] = await db.insert(usersTable).values({
      name: "VSY Admin",
      email: "admin@vsysports.com",
      passwordHash: hash,
      role: "admin",
      phone: "+91-9000000001",
    }).returning();
    adminId = admin.id;
    console.log("Created admin:", admin.email);
  }

  // Owner user
  const existingOwner = await db.select().from(usersTable).where(eq(usersTable.email, "owner@vsysports.com"));
  let ownerId: number;
  if (existingOwner.length > 0) {
    ownerId = existingOwner[0].id;
    console.log("Owner user already exists");
  } else {
    const hash = await bcrypt.hash("Owner@123", 10);
    const [owner] = await db.insert(usersTable).values({
      name: "Ravi Kumar",
      email: "owner@vsysports.com",
      passwordHash: hash,
      role: "turf_owner",
      phone: "+91-9000000002",
    }).returning();
    ownerId = owner.id;
    console.log("Created owner:", owner.email);
  }

  // Turfs
  const existingTurfs = await db.select().from(turfsTable);
  if (existingTurfs.length > 0) {
    console.log("Turfs already seeded, skipping...");
  } else {
    const turfsData = [
      {
        name: "VSY Box Cricket Ground",
        description: "Premium box cricket ground with professional-grade pitch, floodlights, and all amenities. Perfect for corporate and casual matches.",
        pricePerHour: 800,
        images: ["https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80", "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80"],
        rating: 4.8, reviewCount: 124,
        latitude: 17.4401, longitude: 78.3489,
        address: "Plot 45, Gachibowli, Hyderabad", area: "Gachibowli",
        amenities: ["Parking", "Changing Rooms", "Cafeteria", "Equipment Rental", "Floodlights"],
        status: "approved" as const, featured: true, ownerId,
      },
      {
        name: "Champions Arena Box Cricket",
        description: "State-of-the-art box cricket arena with multiple pitches, excellent viewing gallery, and professional coaching staff available.",
        pricePerHour: 700,
        images: ["https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&q=80", "https://images.unsplash.com/photo-1578320339912-f6ce1a14de5e?w=800&q=80"],
        rating: 4.6, reviewCount: 89,
        latitude: 17.4468, longitude: 78.3772,
        address: "Cyber Gateway, Madhapur, Hyderabad", area: "Madhapur",
        amenities: ["Parking", "Showers", "Cafeteria", "Floodlights", "First Aid"],
        status: "approved" as const, featured: true, ownerId,
      },
      {
        name: "Premier Cricket Zone",
        description: "Experience cricket like never before at our premier facility. Professional turf, automated scoring system, and livestream setup available.",
        pricePerHour: 900,
        images: ["https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80", "https://images.unsplash.com/photo-1623128958764-d3de33498a11?w=800&q=80"],
        rating: 4.9, reviewCount: 203,
        latitude: 17.4600, longitude: 78.3545,
        address: "Kondapur Main Road, Kondapur, Hyderabad", area: "Kondapur",
        amenities: ["Parking", "Changing Rooms", "Cafeteria", "Equipment Rental", "Coaching", "Livestream Setup"],
        status: "approved" as const, featured: true, ownerId,
      },
      {
        name: "SportZone Box Cricket",
        description: "Affordable box cricket with great ambiance. Book your slots for morning, afternoon, or evening sessions. Group discounts available.",
        pricePerHour: 600,
        images: ["https://images.unsplash.com/photo-1529516548873-9ce57c8f155e?w=800&q=80"],
        rating: 4.4, reviewCount: 67,
        latitude: 17.4480, longitude: 78.3766,
        address: "HITEC City Road, Madhapur, Hyderabad", area: "HITEC City",
        amenities: ["Parking", "Cafeteria", "Floodlights"],
        status: "approved" as const, featured: false, ownerId,
      },
      {
        name: "Green Pitch Box Cricket",
        description: "Natural grass-style artificial turf in a serene environment. Perfect for weekend family matches and friendly competitions.",
        pricePerHour: 750,
        images: ["https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80"],
        rating: 4.5, reviewCount: 45,
        latitude: 17.4250, longitude: 78.3550,
        address: "Tolichowki Main Road, Hyderabad", area: "Tolichowki",
        amenities: ["Parking", "Changing Rooms", "Equipment Rental"],
        status: "approved" as const, featured: false, ownerId,
      },
    ];

    const slots = [
      { startTime: "06:00", endTime: "07:00" }, { startTime: "07:00", endTime: "08:00" },
      { startTime: "08:00", endTime: "09:00" }, { startTime: "09:00", endTime: "10:00" },
      { startTime: "16:00", endTime: "17:00" }, { startTime: "17:00", endTime: "18:00" },
      { startTime: "18:00", endTime: "19:00" }, { startTime: "19:00", endTime: "20:00" },
      { startTime: "20:00", endTime: "21:00" },
    ];

    for (const turfData of turfsData) {
      const [turf] = await db.insert(turfsTable).values(turfData).returning();
      console.log(`Created turf: ${turf.name}`);
      for (const slot of slots) {
        await db.insert(timeSlotsTable).values({ turfId: turf.id, ...slot });
      }
    }
    console.log("All turfs and slots created.");
  }

  // Events
  const existingEvents = await db.select().from(eventsTable);
  if (existingEvents.length > 0) {
    console.log("Events already seeded, skipping...");
  } else {
    const eventsData = [
      {
        title: "VSY Summer Cup 2025",
        description: "The biggest box cricket tournament of the season! Teams of 8 compete for the grand prize. Registration includes jersey and refreshments.",
        date: "2025-06-15", time: "09:00", venue: "VSY Box Cricket Ground, Gachibowli", area: "Gachibowli",
        image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
        prize: "₹50,000", entryFee: 2000, maxParticipants: 32, currentParticipants: 18, featured: true, status: "upcoming",
      },
      {
        title: "Box Cricket League Season 2",
        description: "Return of the most popular league format! 16 teams battle over 4 weekends. Professional umpires, live scoring, and grand closing ceremony.",
        date: "2025-06-22", time: "08:00", venue: "Champions Arena, Madhapur", area: "Madhapur",
        image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80",
        prize: "₹75,000", entryFee: 3500, maxParticipants: 64, currentParticipants: 42, featured: true, status: "upcoming",
      },
      {
        title: "Corporate Cricket Carnival",
        description: "Bond with your team at our corporate cricket event! Trophies, medals, and catering included.",
        date: "2025-07-05", time: "10:00", venue: "Premier Cricket Zone, Kondapur", area: "Kondapur",
        image: "https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&q=80",
        prize: "₹25,000", entryFee: 1500, maxParticipants: 48, currentParticipants: 28, featured: false, status: "upcoming",
      },
      {
        title: "Hyderabad Open Championship",
        description: "The prestigious annual open championship. Open to all skill levels. Top 3 teams get cash prizes and exclusive VSY Sports merchandise.",
        date: "2025-07-20", time: "07:00", venue: "SportZone, HITEC City", area: "HITEC City",
        image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80",
        prize: "₹1,00,000", entryFee: 4000, maxParticipants: 128, currentParticipants: 56, featured: true, status: "upcoming",
      },
    ];
    for (const ev of eventsData) {
      const [event] = await db.insert(eventsTable).values(ev).returning();
      console.log(`Created event: ${event.title}`);
    }
  }

  // Products
  const existingProducts = await db.select().from(productsTable);
  if (existingProducts.length > 0) {
    console.log("Products already seeded, skipping...");
  } else {
    const products = [
      { name: "SS Ton Reserve Edition Cricket Bat", description: "Premium English Willow Grade 1 bat. Perfect balance, excellent pickup, and powerful drives.", price: 4999, originalPrice: 6500, images: ["https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&q=80"], category: "Bats", brand: "SS", stock: 15, rating: 4.8, reviewCount: 234 },
      { name: "MRF Virat Kohli Genius Cricket Bat", description: "Premium Kashmir Willow with MRF grip and extra-thick edges for maximum power.", price: 3499, originalPrice: 4200, images: ["https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80"], category: "Bats", brand: "MRF", stock: 20, rating: 4.7, reviewCount: 456 },
      { name: "SG Practice Cricket Ball (Pack of 6)", description: "High-quality leather cricket balls for practice and matches. Durable, consistent seam.", price: 899, originalPrice: 1200, images: ["https://images.unsplash.com/photo-1529516548873-9ce57c8f155e?w=400&q=80"], category: "Balls", brand: "SG", stock: 50, rating: 4.6, reviewCount: 312 },
      { name: "Kookaburra Pace Cricket Ball", description: "Professional match-quality ball. Traditional four-piece construction, premium leather.", price: 599, originalPrice: null, images: ["https://images.unsplash.com/photo-1551958219-acbc630e2914?w=400&q=80"], category: "Balls", brand: "Kookaburra", stock: 60, rating: 4.5, reviewCount: 189 },
      { name: "Shrey Pro Guard Cricket Helmet", description: "ABS outer shell with adjustable titanium grille. Meets ICC safety standards.", price: 2799, originalPrice: 3500, images: ["https://images.unsplash.com/photo-1578320339912-f6ce1a14de5e?w=400&q=80"], category: "Helmets", brand: "Shrey", stock: 12, rating: 4.9, reviewCount: 145 },
      { name: "DSP Cricket Batting Gloves", description: "Premium leather palm gloves with high-density foam protection. Excellent grip.", price: 1299, originalPrice: 1800, images: ["https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400&q=80"], category: "Gloves", brand: "DSP", stock: 30, rating: 4.5, reviewCount: 98 },
      { name: "SS Batting Leg Guards (Pads)", description: "Lightweight batting pads with superior protection and comfort.", price: 1899, originalPrice: 2400, images: ["https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80"], category: "Pads", brand: "SS", stock: 18, rating: 4.4, reviewCount: 67 },
      { name: "Puma Cricket Kit Bag - Large", description: "Spacious kit bag with dedicated bat pockets, ventilated shoe compartment, and waterproof base.", price: 2499, originalPrice: 3200, images: ["https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?w=400&q=80"], category: "Bags", brand: "Puma", stock: 10, rating: 4.6, reviewCount: 78 },
      { name: "Nike Dri-FIT Cricket Jersey", description: "Official-look cricket jersey with Dri-FIT technology. Moisture-wicking, quick-dry, UV protection.", price: 1199, originalPrice: 1499, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"], category: "Apparel", brand: "Nike", stock: 40, rating: 4.3, reviewCount: 156 },
      { name: "Adidas Cricket Shoes - Spike", description: "Professional cricket shoes with rubber spikes for perfect grip on turf.", price: 3299, originalPrice: 4000, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"], category: "Apparel", brand: "Adidas", stock: 8, rating: 4.7, reviewCount: 89 },
      { name: "Wicket Keeping Gloves - Pro Series", description: "Professional keeping gloves with cushioned palm and superior grip.", price: 1599, originalPrice: 2000, images: ["https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400&q=80"], category: "Gloves", brand: "GM", stock: 14, rating: 4.5, reviewCount: 43 },
      { name: "Cricket Training Ball - Leather (Pack of 3)", description: "Premium leather training balls with hand-stitched seam. Perfect for net practice.", price: 449, originalPrice: 600, images: ["https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&q=80"], category: "Balls", brand: "SG", stock: 75, rating: 4.4, reviewCount: 267 },
    ];
    for (const p of products) {
      const [product] = await db.insert(productsTable).values(p).returning();
      console.log(`Created product: ${product.name}`);
    }
  }

  console.log("\n✅ Seeding complete!");
  console.log("  Admin:  admin@vsysports.com / Admin@123");
  console.log("  Owner:  owner@vsysports.com / Owner@123");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
