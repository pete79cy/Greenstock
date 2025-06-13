import { db } from "../server/db";
import { documentCategories } from "../shared/schema";

/**
 * Initialize Document Center with predefined categories
 */
async function initDocumentCenter() {
  console.log("Initializing Document Center...");

  const categories = [
    {
      code: "FOUNDATION",
      nameEl: "Ιδρυτικά Έγγραφα",
      nameEn: "Foundation Documents",
      description: "Καταστατικό, τροποποιήσεις και λοιπά ιδρυτικά έγγραφα της επιχείρησης"
    },
    {
      code: "OPERATING_LICENSE",
      nameEl: "Ετήσιες Άδειες Λειτουργίας",
      nameEn: "Annual Operating Licenses",
      description: "Άδειες λειτουργίας καταστήματος, περιβαλλοντικές άδειες και λοιπές ετήσιες άδειες"
    },
    {
      code: "NURSERY_LICENSE",
      nameEl: "Άδειες Φυτωρίου Παραγωγής",
      nameEn: "Nursery Production Licenses",
      description: "Ετήσιες/τριετείς άδειες φυτωρίου, επιθεωρήσεις και πιστοποιήσεις παραγωγής"
    },
    {
      code: "REGULATORY_COMPLIANCE",
      nameEl: "Έγγραφα Συμμόρφωσης",
      nameEn: "Regulatory Compliance Documents",
      description: "ΦΥ/ΠΥ 3 φόρμες, εργαστηριακές αναλύσεις, διαβατήρια φυτών, άδειες εισαγωγής λιπασμάτων"
    },
    {
      code: "FINANCIAL",
      nameEl: "Οικονομικά Έγγραφα",
      nameEn: "Financial Documents",
      description: "Λογιστικά βιβλία, φορολογικές δηλώσεις, ισολογισμοί και λοιπά οικονομικά έγγραφα"
    },
    {
      code: "INSURANCE",
      nameEl: "Ασφαλιστικά Έγγραφα",
      nameEn: "Insurance Documents",
      description: "Ασφαλιστήρια συμβόλαια, πολιτικές κάλυψης και αποζημιώσεις"
    },
    {
      code: "CONTRACTS",
      nameEl: "Συμβάσεις",
      nameEn: "Contracts",
      description: "Συμβάσεις με προμηθευτές, πελάτες, εργαζομένους και συνεργάτες"
    }
  ];

  try {
    for (const category of categories) {
      await db.insert(documentCategories)
        .values(category)
        .onConflictDoNothing();
    }
    
    console.log(`✅ Successfully initialized ${categories.length} document categories`);
    
    // Verify categories were created
    const createdCategories = await db.select().from(documentCategories);
    console.log("Created categories:", createdCategories.map(c => c.nameEl));
    
  } catch (error) {
    console.error("❌ Error initializing document categories:", error);
    throw error;
  }
}

if (require.main === module) {
  initDocumentCenter()
    .then(() => {
      console.log("Document Center initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Document Center initialization failed:", error);
      process.exit(1);
    });
}

export { initDocumentCenter };