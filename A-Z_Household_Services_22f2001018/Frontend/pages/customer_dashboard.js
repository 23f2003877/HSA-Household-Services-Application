export default {
  data() {
    return {
      message: null,      
      category: null,
      services: [],  // Holds available services
      error: null,  // To handle any errors
    };
  },
  mounted() {
    this.fetchServices();
  },
  methods: {
    async fetchServices() {
      try {
        const response = await fetch("/customer/dashboard", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch services.");
        }

        const data = await response.json();
        this.services = data.services || [];  // Set services data
        this.error = null;  // Reset error if the fetch is successful
      } catch (error) {
        console.error("Error fetching services:", error);
        this.error = "Unable to fetch services at the moment. Please try again later.";
      }
    },
  },
  template: `
    <div class="card mb-4">
      <div class="card-header bg-primary text-white">Available Services</div>
      <div class="card-body">
        <!-- Display Error Message -->
        <div v-if="error" class="alert alert-danger">{{ error }}</div>

        <!-- Services Table -->
        <table class="table table-striped" v-if="!error">
          <thead class="thead-dark">
            <tr>
              <th>Service Name</th>
              <th>Category</th>
              <th>Base Price ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in services" :key="service.id">
              <td>{{ service.name }}</td>
              <td>{{ service.category }}</td>
              <td>{{ service.base_price }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
