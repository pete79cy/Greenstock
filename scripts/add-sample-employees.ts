import { db } from "../server/db";
import { employees } from "../shared/schema";

async function addSampleEmployees() {
  console.log("Adding sample employees with passport-based identification...");

  const sampleEmployees = [
    {
      passport: "A33686904",
      name: "ROMANY FAWZY ASHAK MOAWAD",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1983-03-21",
      arc: "60093870F",
      socialInsurance: "581964868",
      taxId: "1756929",
      monthlySalary: 150000, // €1500 in cents
      isActive: 1,
    },
    {
      passport: "A36548439",
      name: "KHALIL KAMAL KHALIL HANNA",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1984-03-05",
      arc: "60093813R",
      socialInsurance: "500626698",
      taxId: "1098755",
      monthlySalary: 160000, // €1600 in cents
      isActive: 1,
    },
    {
      passport: "A26306948",
      name: "MEKHAEL NAEIM WASEF AMIN",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1989-10-25",
      arc: "60093703R",
      socialInsurance: "581845244",
      taxId: "1627029",
      monthlySalary: 155000, // €1550 in cents
      isActive: 1,
    },
    {
      passport: "A34731566",
      name: "MARWAN YOUSSEF SHAKER MOUSSA",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1990-07-30",
      arc: "60094855I",
      socialInsurance: "500692775",
      taxId: "1302714",
      monthlySalary: 170000, // €1700 in cents
      isActive: 1,
    },
    {
      passport: "A29625914",
      name: "MAIKEL YOUSSEF SHAKER MOUSSA",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1999-12-29",
      arc: "60093809Y",
      socialInsurance: "581870730",
      taxId: "1663599",
      monthlySalary: 145000, // €1450 in cents
      isActive: 1,
    },
    {
      passport: "A26540193",
      name: "KERLOS SAYED FATHY ASAAD",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "2002-09-01",
      arc: "60093421Q",
      socialInsurance: "581863693",
      taxId: "1651167",
      monthlySalary: 140000, // €1400 in cents
      isActive: 1,
    },
    {
      passport: "A26553870",
      name: "MINA GERGES FARAG MOAWAD",
      designation: "Employee",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "1990-07-04",
      arc: "60116856G",
      socialInsurance: "581964307",
      taxId: "1756563",
      monthlySalary: 165000, // €1650 in cents
      isActive: 1,
    },
  ];

  for (const employee of sampleEmployees) {
    try {
      const [newEmployee] = await db.insert(employees).values(employee).returning();
      console.log(`✓ Created employee: ${newEmployee.name} (Passport: ${newEmployee.passport})`);
    } catch (error) {
      console.error(`✗ Failed to create employee ${employee.name}:`, error);
    }
  }

  console.log("Sample employees added successfully!");
}

// Run the script
addSampleEmployees().catch(console.error);