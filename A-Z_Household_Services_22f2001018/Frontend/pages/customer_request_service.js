export default {
  template: `
    <div>
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">Request Service</div>
        <div class="card-body">
          <form @submit.prevent="submitServiceRequest">
            <div class="form-group">
              <label for="requestDate">Date:</label>
              <input v-model="form.requestDate" type="date" id="requestDate" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="category">Category:</label>
              <select v-model="form.category" id="category" class="form-control" required @change="loadServices">
                <option value="">Select Category</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrician">Electrician</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </div>
            <div class="form-group">
              <label for="service">Service:</label>
              <select v-model="form.service" id="service" class="form-control" required @change="loadProfessionals">
                <option value="">Select Service</option>
                <option v-for="service in services" :key="service.id" :value="service.id">
                  {{ service.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="professional">Professional:</label>
              <select v-model="form.professional" id="professional" class="form-control" required>
                <option value="">Select Professional</option>
                <option v-for="professional in professionals" :key="professional.id" :value="professional.id">
                  {{ professional.fullname }}
                </option>
              </select>
            </div>
            <button class="btn btn-success" type="submit">Request Service</button>
            <div v-if="successMessage" class="text-success mt-3">{{ successMessage }}</div>
          </form>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        requestDate: "",
        category: "",
        service: "",
        professional: ""
      },
      services: [],
      professionals: [],
      successMessage: ""
    };
  },
  methods: {
    // Fetch services based on category selection
    async loadServices() {
      this.services = [];
      this.professionals = [];
      if (!this.form.category) return;
      try {
        const res = await fetch(`${location.origin}/get_services/${this.form.category}`);
        const data = await res.json();
        if (res.ok) {
          this.services = data.services;
        }
      } catch (error) {
        console.error("Error loading services:", error);
      }
    },

    // Fetch professionals based on the selected service
    async loadProfessionals() {
      this.professionals = [];
      if (!this.form.service) return;
      try {
        const res = await fetch(`${location.origin}/get_professionals/${this.form.category}`);
        const data = await res.json();
        if (res.ok) {
          this.professionals = data.professionals;
        }
      } catch (error) {
        console.error("Error loading professionals:", error);
      }
    },

    // Handle service request submission
    async submitServiceRequest() {
      this.successMessage = "";
      try {
        const res = await fetch(`${location.origin}/customer/request-service`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify(this.form)
        });
        const data = await res.json();
        if (res.ok) {
          this.successMessage = "Service request submitted successfully!";
          this.form = { requestDate: "", category: "", service: "", professional: "" };
          this.services = [];
          this.professionals = [];
        }
      } catch (error) {
        console.error("Error submitting service request:", error);
      }
    }
  }
};
