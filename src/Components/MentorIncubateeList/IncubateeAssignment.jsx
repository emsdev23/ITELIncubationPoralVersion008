import React, { useRef } from "react";
import "./TrainingAssignment.css"; // page-specific CSS
import styles from "../Navbar.module.css"; // CSS module for scoped styles
import ITELLogo from "../../assets/ITEL_Logo.png"; // Logo image
import { NavLink } from "react-router-dom";
import { FolderDown, MoveLeft } from "lucide-react"; // Icon for the button
import IncubeeAssignmentTable from "./IncubateeAssignmentTable";
import { IPAdress } from "../Datafetching/IPAdrees";

export default function IncubateeAssignment() {

  return (
    <div className="doc-management-page">
      <main className="doc-management-main" style={{ paddingTop: "100px" }}>
        <h1>🔗 Assigned Incubatee List</h1>
        <section className="doccat-section">
          {/* Pass the callback to TrainingModule */}
          <IncubeeAssignmentTable />
        </section>
      </main>
    </div>
  );
}