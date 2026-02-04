# ARPA-E Fusion Costing Code (FCC) Reference (Public Proxy)

**Source:** Simon Woodruff, *A Costing Framework for Fusion Power Plants* (arXiv preprint, Jan 2026).  
**File:** `A_costing_framework_for_fusion_power_plants.pdf` :contentReference[oaicite:0]{index=0}

## Status and intended use
This document is a **publicly citable proxy** for the **ARPA-E Fusion Costing Code (FCC)** and its associated costing framework.

Use it as an authoritative reference for:
- The **chart of accounts / costing ontology** used in ARPA-E fusion costing support work (2017–2024).
- How fusion subsystems map into a **standards-aligned code-of-accounts (COA)** (IAEA / GEN-IV EMWG / EPRI lineage).
- The “physics → engineering constraints → plant layout → cost accounts → LCOE” workflow used in **FECONs / pyFECONs**.

Do **not** represent it as an official ARPA-E policy issuance. Represent it as *documented implementation from ARPA-E-supported costing work*.

## Why this is a strong FCC reference
The paper states it consolidates **fusion power-plant costing work performed in support of ARPA-E from 2017–2024**, applied across **BETHE and GAMOW** (and select **ALPHA** revisits), and describes a refactor to align with the **IAEA–GEN-IV EMWG–EPRI** COA lineage. :contentReference[oaicite:1]{index=1}

It includes a **complete chart of accounts** used for ARPA-E work (Appendix A). :contentReference[oaicite:2]{index=2}

## How to cite (recommended wording)
**Recommended citation text (for reports / repos):**
> “We follow the ARPA-E fusion costing framework as documented by Woodruff (2026), which consolidates ARPA-E-supported fusion costing work (2017–2024) and maps fusion subsystems into a standards-aligned code-of-accounts (IAEA / GEN-IV EMWG / EPRI lineage).” :contentReference[oaicite:3]{index=3}

**What not to say:**
- “As defined by ARPA-E (official FCC document) …”  
Instead say:
- “As implemented/documented in ARPA-E-supported costing work …”

## Scope notes (important)
- The chart of accounts provided is explicitly described as **guidance**, with customization required per plant/concept. :contentReference[oaicite:4]{index=4}
- The Appendix A chart is shown for an **MFE** system; **IFE/MIF** are “almost identical” except for major driver placement (e.g., lasers or pulsed power). :contentReference[oaicite:5]{index=5}
- The implementation described is primarily **NOAK-oriented**; FOAK procurement and industrialization constraints require additional modeling (materials purity, supply chain, licensing, etc.). :contentReference[oaicite:6]{index=6}

## Key concepts (LLM-friendly)
### Standards-aligned top-level accounts (“10-level”)
Top-level COA categories (GEN-IV EMWG style) used as reporting buckets:
- **10**: Pre-construction costs
- **20**: Capitalized direct costs
- **30**: Capitalized indirect service costs
- **40**: Capitalized owner’s costs
- **50**: Capitalized supplementary costs
- **60**: Capitalized financial costs :contentReference[oaicite:7]{index=7}

The paper explains equivalence/mapping between:
- IAEA TCIC COA (2001)
- GEN-IV EMWG COA (2007)
- EPRI nuclear plant cost accounts (2024) :contentReference[oaicite:8]{index=8}

### Workflow (physics to cost to LCOE)
The implemented workflow described (pyFECONs example):
1. Physics-informed **power balance** → gross/net electric output
2. **Radial build / geometry** subject to engineering constraints
3. Dominant driver sizing (magnets / lasers / pulsed power)
4. Balance-of-plant sizing anchored to external baselines (NETL)
5. Assemble direct + indirect accounts, then annualized costs and LCOE :contentReference[oaicite:9]{index=9}

## FCC-style Chart of Accounts (canonical list)
**Authoritative within this proxy:** Appendix A “Chart of Accounts” (pages ~22–24).  
Below is the main structure and fusion-relevant subaccounts.

### 10 Pre-construction costs
- 12 Site Permits
- 13 Plant Licensing
- 14 Plant Permits
- 15 Plant Studies
- 16 Plant Reports
- 17 Other Pre-Construction Costs
- 19 Contingency on Pre-Construction Costs :contentReference[oaicite:10]{index=10}

### 20 Capitalized Direct Costs (CDC)
#### 21 Structures and Improvements
- 21.1 Site Preparation / Yard Work
- 21.2 Heat Island Building
- 21.3 Turbine Generator Building :contentReference[oaicite:11]{index=11}

#### 22 Heat Island Plant Equipment
##### 22.1 Heat Island Components
- 22.1.1 First Wall and Blanket
- 22.1.2 Shield
- 22.1.3 Coils (or primary driver placeholder in some variants)
- 22.1.4 Supplementary Heating Systems
- 22.1.5 Primary Structure and Support
- 22.1.6 Vacuum System
- 22.1.7 Power Supplies
- 22.1.8 Electrodes or Plasma Guns
- 22.1.9 Direct Energy Convertor
- 22.01.11 Assembly and Installation Costs (with sub-lines per subsystem) :contentReference[oaicite:12]{index=12}

##### 22.2 Main and Secondary Coolant
- Primary coolant system (pumps, piping, heat exchangers, tanks, clean-up, insulation, tritium extraction, etc.)
- Secondary coolant system (analogous)
- Thermal storage system :contentReference[oaicite:13]{index=13}

##### 22.03 Auxiliary Cooling Systems
- Includes power supply & cooling system, refrigeration, purification, etc. :contentReference[oaicite:14]{index=14}

##### 22.04 Radioactive Waste Treatment
- Liquid waste processing
- Gaseous/off-gas processing
- Solid waste processing :contentReference[oaicite:15]{index=15}

##### 22.5 Fuel Handling and Storage
##### 22.6 Other Reactor Plant Equipment
##### 22.7 Instrumentation and Control :contentReference[oaicite:16]{index=16}

#### 23 Turbine Plant Equipment
#### 24 Electric Plant Equipment
#### 25 Miscellaneous Plant Equipment
#### 26 Heat Rejection
#### 27 Special Materials
#### 28 Digital Twin / Simulator
#### 29 Contingency on Direct Capital Costs :contentReference[oaicite:17]{index=17}

### 30 Capitalized Indirect Service Costs (CISC)
- 31 Field Indirect Costs
- 32 Construction Supervision
- 33 Commissioning and Start-up Costs
- 34 Demonstration Test Run
- 35 Design Services (Offsite)
- 36 PM/CM Services (Offsite)
- 37 Design Services (Onsite)
- 38 PM/CM Services (Onsite)
- 39 Contingency on Support Services :contentReference[oaicite:18]{index=18}

### 40 Capitalized Owner’s Cost (COC)
- 41 Staff Recruitment and Training
- 42 Staff Housing
- 43 Staff Salary-Related Costs
- 44 Other Owner’s Costs
- 49 Contingency on Owner’s Costs :contentReference[oaicite:19]{index=19}

### 50 Capitalized Supplementary Costs (CSC)
- 51 Shipping and Transportation Costs
- 52 Spare Parts
- 53 Taxes
- 54 Insurance
- 55 Initial Fuel Load
- 58 Decommissioning Costs
- 59 Contingency on Supplementary Costs :contentReference[oaicite:20]{index=20}

### 60 Capitalized Financial Costs (CFC)
- 61 Escalation
- 62 Fees
- 63 Interest During Construction (IDC)
- 69 Contingency on Capitalized Financial Costs :contentReference[oaicite:21]{index=21}

### Annualized accounts (operations and finance)
- 70 Annualized O&M Cost (AOC)
- 80 Annualized Fuel Cost (AFC)
- 90 Annualized Financial Costs :contentReference[oaicite:22]{index=22}

## Interpretation rules (to keep LLM outputs consistent)
1. **“Heat island”** corresponds to the fusion-unique core plus immediate plant systems (fusion island and adjacent equipment/buildings).
2. **Account 22.1.3** is treated as the **dominant driver slot** across concept classes:
   - MFE: magnets dominate
   - IFE: lasers dominate
   - MIF: pulsed power (and sometimes magnets) dominate :contentReference[oaicite:23]{index=23}
3. **Direct energy conversion** exists explicitly as **22.1.9**, but may be unused in many baseline analyses. :contentReference[oaicite:24]{index=24}
4. The COA is a **container**: it enforces comparability, but does not by itself guarantee correct subsystem realization.

## Known limitations for “advanced / non-plant-like” concepts
The COA is designed around a plant with capital assets and standard subsystems. For concepts where economics is dominated by:
- high-throughput consumables,
- catalyst/particle production (e.g., muon production),
- materials preparation cycles (e.g., lattice reload/conditioning),
the COA may require an extension layer to represent:
- catalysts/enablers as quasi-fuel streams,
- throughput constraints (output per input unit),
- non-traditional core assets (particle factories) as first-class accounts.

When extending, preserve the base COA mapping and add a concept-specific annex rather than redefining categories.

## Minimal “authoritative facts” (safe claims)
- The paper consolidates ARPA-E-supported fusion costing work from 2017–2024. :contentReference[oaicite:25]{index=25}
- It aligns the framework to IAEA / GEN-IV EMWG / EPRI COA lineage. :contentReference[oaicite:26]{index=26}
- It provides a complete chart of accounts used for ARPA-E work (Appendix A). :contentReference[oaicite:27]{index=27}
- It describes an executable implementation (FECONs / pyFECONs) that realizes accounts from physics-to-plant quantities and computes LCOE. :contentReference[oaicite:28]{index=28}
