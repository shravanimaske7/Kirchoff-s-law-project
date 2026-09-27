# Kirchhoff's Law 3D Virtual Lab & AI Circuit Workbench

### Problem Statement Fit

This project addresses the conceptual difficulties students face when learning electric circuit analysis, specifically the persistent confusion surrounding "sign conventions" ($+ / -$), voltage drops versus electromotive force rises, and the application of Kirchhoff's Current Law (KCL) and Kirchhoff's Voltage Law (KVL). Many learners struggle with abstract 2D schematic diagrams and fail to intuitively grasp charge conservation and energy conservation in closed loops. 

Our application bridges this gap by providing an interactive, dual-workbench environment where circuits can be designed in 2D or reconstructed automatically from uploaded apparatus photographs, immediately translating into an interactive 3D simulation with live directional electron flow, collision-based dual-probe multimeter measurements, and real-time nodal/mesh equation solving.

### Target Users

- **Undergraduate & High School Electrical/Physics Students**: Learners who struggle to visualize current flow, nodal summation, and loop polarities in standard classroom theory.
- **STEM Educators & Lab Instructors**: Teachers needing an interactive demonstration platform for virtual lectures, assignment verifications, and remote lab instruction.
- **Self-Directed Learners & Hobbyists**: Individuals who lack access to physical laboratory breadboards, bench power supplies, ammeters, or multimeters.

### What We Built

We built a web-based, hardware-accelerated interactive circuit laboratory that features:
1. A synchronized dual workbench displaying both an interactive 2D schematic wiring canvas and an animated 3D Three.js circuit model.
2. An AI-assisted 2D schematic/photo-to-3D circuit generator that translates uploaded circuit photos into functioning 3D components and closed loops.
3. An interactive educational "Learn" manual containing comparison tables, circuit definitions, experiment flowcharts, and theoretical step-by-step guides.
4. An automated KCL and KVL verification engine that calculates current, loop voltages, and individual branch drops based strictly on user-constructed circuits.
5. Collision-based dual-probe voltmeter measurements and junction current inspection to resolve sign convention misconceptions.
6. A built-in Digital Lab Notebook that logs real-time experimental data and calculates net voltage and current sums for lab reporting.

### Core Features

- **Dual Synchronized 2D/3D Circuit Workbench**: Building or repositioning circuit elements in the top 2D schematic editor dynamically updates the 3D perspective viewport in real time with color-coded resistor stripes, contact terminals, and Catmull-Rom spline wires with animated electron drift.
- **AI 2D Circuit Photo-to-3D Generator**: Users can upload photographs or hand-drawn schematics of physical circuits (such as DC power cells, telegraph switches, and lamps); the system scans the topology and automatically reconstructs the working 3D circuit.
- **Collision-Based Dual-Probe Voltmeter with Algebraic Sign Logic**: Users can place red ($+$) and black ($-$) voltmeter leads onto component terminals to observe how probe orientation dictates algebraic sign polarity ($+V$ rise vs. $-V$ drop), eliminating sign convention confusion.
- **Junction Node KCL Inspector**: Clicking any circuit junction displays incoming and outgoing branch currents, verifying $\Sigma I_{\text{in}} = \Sigma I_{\text{out}}$ in real time.
- **One-Click Dual-Law Verifier ("✓ VERIFY BOTH KIRCHHOFF'S LAWS")**: Executes topological graph analysis across the network to check whether the loop is closed and verifies both $\Sigma I = 0$ (Conservation of Charge) and $\Sigma V = 0$ (Conservation of Energy).
- **Interactive Digital Lab Notebook**: Allows students to capture live voltage and current readings into an exportable table with automated summation of captured values.

### Technical Architecture

- **Rendering & Visualization Pipeline**: Built using native HTML5 Canvas API for the 2D schematic editor coupled with Three.js (WebGL) for the 3D perspective view, sustaining a smooth 60 FPS performance.
- **Topological Circuit Solver**: Utilizes graph adjacency matrices to evaluate node connections, total equivalent resistance ($R_{\text{total}} = \Sigma R$), branch current distribution ($I = V_{\text{source}} / R_{\text{total}}$), and individual Ohm's law drops ($V_n = I \cdot R_n$).
- **Collision Probing Subsystem**: Enforces terminal radius proximity checks ensuring virtual probes only register voltage readings when in contact with component leads.
- **Session & Identity Gatekeeper**: Client-side authentication and authorization modules validating user identity and institutional domain formats before granting laboratory access.
- **High-Concurrency Ready**: Bundled with a production-ready Nginx configuration and Kubernetes deployment manifest leveraging HTTP keepalive, open file descriptor caching, and Gzip compression to prevent lag under multi-user access.

### Tech Stack

- **Frontend Core**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **3D Graphics & Animation**: Three.js (r128), OrbitControls
- **2D Schematic Engine**: HTML5 Canvas API
- **Mathematical Computation**: Custom DC Nodal & Mesh Topological Graph Solver
- **Deployment & Server**: Nginx, Docker, Kubernetes (`deployment.yaml`), CreatorCode CI/CD

### Innovation / Uniqueness

Unlike traditional circuit simulators that rely solely on flat 2D circuit schematics or static pre-calculated values, our platform:
1. Provides dual real-time rendering where every 2D connection immediately animates in 3D space with continuous electron particle flows.
2. Directly tackles the educational "sign convention" gap by enabling hands-on probe polarity placement with live $+ / -$ potential tracking.
3. Incorporates automated 2D image analysis to instantiate interactive 3D circuits from physical apparatus images.
4. Implements zero pre-baked or auto-fetched calculations; all telemetry is computed strictly from the topology wired by the student.

### Demo Instructions

1. On the landing page, click **"Sign In →"** and sign in using your email address (or click **"Sign in with Google"**).
2. Navigate to the **"Virtual Lab"** view from the top header navigation.
3. In the left panel, adjust the DC Source voltage or component counters and click **"CREATE COMPONENTS"**, or click **"LOAD DEFAULT CIRCUIT"** to load the reference bridge loop.
4. Switch to **"WIRE"** mode and connect terminals to establish a closed circuit loop.
5. Click **"⚡ SIMULATE KVL"** to observe live current redistribution and individual resistor voltage drops.
6. Switch to **"PROBE MODE"** and click any two terminals to place the Red ($+$) and Black ($-$) voltmeter leads to observe the measured potential difference and sign convention.
7. Click the green **"✓ VERIFY BOTH KIRCHHOFF'S LAWS"** button on the right panel to confirm that $\Sigma I = 0$ and $\Sigma V = 0.00\text{ V}$.
8. Click **"📝 CAPTURE"** to log the active measurement directly into the Digital Lab Notebook.

### Known Limitations

- The current mathematical solver is optimized for DC circuits; AC frequency domain analysis (capacitive and inductive reactance) is not yet supported.
- Non-linear semiconductor devices (such as silicon diodes and bipolar junction transistors) are not currently included in the component library.
- The 2D image-to-3D converter currently maps standard elementary circuit components (batteries, switches, lamps, resistors, meters) and does not parse multi-stage IC chip packages.

### Future Work

- **WebXR Immersive Headset Support**: Integrate WebXR controllers for full spatial virtual reality immersion in VR/AR headsets.
- **AC RLC Circuit Analysis**: Add alternating current sources, inductors, and capacitors with real-time phasor diagrams and impedance solving.
- **Real-Time WebRTC Peer Collaboration**: Enable multi-student collaborative sessions where laboratory partners can manipulate probes and inspect meters simultaneously on shared circuits.