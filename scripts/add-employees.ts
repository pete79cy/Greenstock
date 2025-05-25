import { db } from "../server/db";
import { employees } from "../shared/schema";

// Employee data from the provided image
const employeesToAdd = [
  {
    name: "ROMANY FAWZY ASHAK MOAWAD",
    designation: "Agricultural Worker",
    paymentMethod: "Cash",
    passport: "A33686904",
    arc: "581964868",
    socialInsurance: "1756929",
    taxId: "60093870F",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
  {
    name: "KHALIL KAMAL KHALIL HANNA",
    designation: "Agricultural Worker", 
    paymentMethod: "Cash",
    passport: "A36548439",
    arc: "500626698",
    socialInsurance: "1098755",
    taxId: "60093813R",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
  {
    name: "MEKHAEL NAEIM WASEF AMIN",
    designation: "Agricultural Worker",
    paymentMethod: "Cash", 
    passport: "A26306948",
    arc: "581845244",
    socialInsurance: "1627029",
    taxId: "60093703R",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
  {
    name: "MARWAN YOUSSEF SHAKER MOUSSA",
    designation: "Agricultural Worker",
    paymentMethod: "Cash",
    passport: "A34731566",
    arc: "500692779",
    socialInsurance: "1302714",
    taxId: "60094855I",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
  {
    name: "MAIKEL YOUSSEF SHAKER MOUSSA",
    designation: "Agricultural Worker",
    paymentMethod: "Cash",
    passport: "A29625914",
    arc: "581870730",
    socialInsurance: "1663599",
    taxId: "60093809Y",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
  {
    name: "MINA GERGES FARAG MOAWAD",
    designation: "Agricultural Worker",
    paymentMethod: "Cash",
    passport: "A26553870",
    arc: "581964307",
    socialInsurance: "1756563",
    taxId: "60116856G",
    monthlySalary: 46500, // €465.00 in cents
    isActive: 1,
  },
];

async function addEmployees() {
  try {
    console.log("Adding employees to the database...");
    
    for (const employee of employeesToAdd) {
      const [result] = await db.insert(employees).values(employee).returning();
      console.log(`Added employee: ${result.name} (ID: ${result.id})`);
    }
    
    console.log("All employees added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding employees:", error);
    process.exit(1);
  }
}

addEmployees();