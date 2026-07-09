export default {
    template: `
      <div>
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">Update Service Request</div>
          <div class="card-body">
            <form @submit.prevent="submitServiceRequest">
              <div class="form-group">
                <label for="requestId">Select Pending Request:</label>
                <select v-model="selectedRequestId" @change="loadRequestData" class="form-control" required>
                  <option value="">Select Request</option>
                  <option v-for="req in pendingRequests" :key="req.id" :value="req.id">
                    {{ req.id }} ({{ req.category }})
                  </option>
                </select>
              </div>
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
              <button class="btn btn-success" type="submit">Update Request</button>
              <div v-if="successMessage" class="text-success mt-3">{{ successMessage }}</div>
            </form>
          </div>
        </div>
      </div>
    `,
    data() {
      return {
        selectedRequestId: "",
        form: {
          requestDate: "",
          category: "",
          service: "",
          professional: ""
        },
        pendingRequests: [],
        services: [],
        professionals: [],
        successMessage: ""
      };
    },
    methods: {
      async loadPendingRequests() {
        try {
          const res = await fetch(`${location.origin}/customer/pending-requests`, {
            headers: { Authorization: "Bearer " + localStorage.getItem("token") }
          });
          const data = await res.json();
          if (res.ok) {
            this.pendingRequests = data;
          }
        } catch (error) {
          console.error("Error loading pending requests:", error);
        }
      },
      async loadRequestData() {
        const selectedRequest = this.pendingRequests.find(req => req.id == this.selectedRequestId);
        if (selectedRequest) {
          this.form.requestDate = selectedRequest.request_date;
          this.form.category = selectedRequest.category;
          this.form.service = selectedRequest.service_id;
          this.form.professional = selectedRequest.professional_id;
          await this.loadServices();
          await this.loadProfessionals();
        }
      },
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
      async submitServiceRequest() {
        this.successMessage = "";
        try {
          const res = await fetch(`${location.origin}/customer/update-request/${this.selectedRequestId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(this.form)
          });
          const data = await res.json();
          if (res.ok) {
            this.successMessage = "Service request updated successfully!";
            this.loadPendingRequests();
          }
        } catch (error) {
          console.error("Error updating service request:", error);
        }
      }
    },
    mounted() {
      this.loadPendingRequests();
    }
  };
  