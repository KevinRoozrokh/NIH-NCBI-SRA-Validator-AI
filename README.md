# NIH-NCBI-SRA-Validator-AI

## 🧬 Understanding the NCBI SRA Validator AI

This application serves as a **"Flight Simulator for DNA Data"** designed to optimize cloud operations for the world's largest biological databases, specifically those managed by the National Center for Biotechnology Information (NCBI) within the National Institutes of Health (NIH).

It leverages **Generative AI** capabilities to simulate, validate, and troubleshoot data submissions for the **Sequence Read Archive (SRA)**, ensuring data quality, structural integrity, and adherence to NCBI's submission guidelines before deployment in a cloud environment.

-----

## ✨ Key Features

  * **SRA Data Simulation:** Create synthetic but structurally accurate NCBI SRA metadata and sequence submission scenarios for testing.
  * **AI-Powered Validation:** Utilize the Gemini API to analyze proposed SRA data models and metadata for potential errors, missing fields, and compliance issues.
  * **Cloud Optimization Insights:** Gain recommendations on how to structure and prepare submissions to minimize processing time and cost in cloud-based storage and compute pipelines.
  * **Interactive Interface:** A modern, TypeScript-based web application for easy interaction and visualization of validation results.

-----

## 🚀 Run Locally

This project was generated from a Google Gemini AI Studio repository template and requires Node.js and a Gemini API key to run.

### Prerequisites

  * **Node.js** (LTS version recommended)
  * **Git**

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/KevinRoozrokh/NIH-NCBI-SRA-Validator-AI.git
    cd NIH-NCBI-SRA-Validator-AI
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure API Key:**
    Create a file named `.env.local` in the root of the project directory and add your Gemini API key:

    ```
    # .env.local
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

4.  **Run the application:**

    ```bash
    npm run dev
    ```

The application will now be running on `http://localhost:5173` (or a similar port displayed in your terminal).

-----

## 🛠️ Built With

  * **TypeScript**
  * **React** (Inferred from `.tsx` files)
  * **Vite** (Build Tool)
  * **Google Gemini API** (For AI validation and simulation logic)

-----

## 🤝 Contributing

This project is open-source. Contributions are welcome\! Please feel free to open an issue or submit a pull request.

-----

## 📝 License

This project is licensed under the **MIT License**.

-----

## 👤 Author

  * \<a href="[https://kevinroozrokh.com](https://kevinroozrokh.com)" target="\_blank"\>**Kevin Roozrokh**\</a\>
