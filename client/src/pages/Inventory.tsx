import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";

export default function Inventory() {
  console.log("Inventory component rendering");
  
  // Create a simple version of the component first to see if it works
  return (
    <>
      <Helmet>
        <title>Inventory | Plant Inventory Management System</title>
        <meta name="description" content="Manage your plant inventory with advanced filtering and sorting options" />
      </Helmet>
      <div className="p-8">
        <h1 className="text-3xl font-bold">Inventory Test Page</h1>
        <p className="mt-4">If you can see this, the Inventory component is working.</p>
      </div>
    </>
  );
}
