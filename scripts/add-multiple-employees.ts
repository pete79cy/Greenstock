import { db } from "../server/db.js";
import { employees } from "../shared/schema.js";

async function addMultipleEmployees() {
  const employeesToAdd = [
    {
      passport: "A33686904",
      name: "ROMANY FAWZY ASHAK MOAWAD",
      designation: "Agricultural Worker",
      paymentMethod: "Cash",
      dateOfBirth: "1983-03-21",
      arc: "581964868",
      socialInsurance: "1756929",
      taxId: "60093870F",
      monthlySalary: 46500, // 465 euros in cents
    },
    {
      passport: "A36548439",
      name: "KHALIL KAMAL KHALIL HANNA",
      designation: "Agricultural Worker", 
      paymentMethod: "Cash",
      dateOfBirth: "1984-03-05",
      arc: "500626698",
      socialInsurance: "1098755",
      taxId: "60093813R",
      monthlySalary: 46500, // 465 euros in cents
    },
    {
      passport: "A26306948",
      name: "MEKHAEL NAEIM WASEF AMIN",
      designation: "Agricultural Worker",
      paymentMethod: "Cash", 
      dateOfBirth: "1989-10-25",
      arc: "581845244",
      socialInsurance: "1627029",
      taxId: "60093703R",
      monthlySalary: 46500, // 465 euros in cents
    },
    {
      passport: "A34731566",
      name: "MARWAN YOUSSEF SHAKER MOUSSA",
      designation: "Agricultural Worker",
      paymentMethod: "Cash",
      dateOfBirth: "1990-07-30", 
      arc: "500692775",
      socialInsurance: "1302714",
      taxId: "60094855I",
      monthlySalary: 46500, // 465 euros in cents
    },
    {
      passport: "A29625914",
      name: "MAIKEL YOUSSEF SHAKER MOUSSA",
      designation: "Agricultural Worker",
      paymentMethod: "Cash",
      dateOfBirth: "1999-12-29",
      arc: "581870730", 
      socialInsurance: "1663599",
      taxId: "60093809Y",
      monthlySalary: 46500, // 465 euros in cents
    },
    {
      passport: "A26553870",
      name: "MINA GIRGES FARAG MOAWAD", 
      designation: "Agricultural Worker",
      paymentMethod: "Cash",
      dateOfBirth: "1990-04-07",
      arc: "581964307",
      socialInsurance: "1756563", 
      taxId: "60116856G",
      monthlySalary: 46500, // 465 euros in cents
    }
  ];

  try {
    console.log("Adding multiple employees...");
    
    for (const employee of employeesToAdd) {
      console.log(`Adding employee: ${employee.name}`);
      
      await db.insert(employees).values({
        passport: employee.passport,
        name: employee.name,
        designation: employee.designation,
        paymentMethod: employee.paymentMethod,
        dateOfBirth: employee.dateOfBirth,
        arc: employee.arc,
        socialInsurance: employee.socialInsurance,
        taxId: employee.taxId,
        monthlySalary: employee.monthlySalary,
        isActive: 1
      });
      
      console.log(`✓ Successfully added: ${employee.name}`);
    }
    
    console.log("All employees added successfully!");
    
  } catch (error) {
    console.error("Error adding employees:", error);
  }
}

addMultipleEmployees();