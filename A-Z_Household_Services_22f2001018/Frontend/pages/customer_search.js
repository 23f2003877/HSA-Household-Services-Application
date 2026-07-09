export default {
  template: `
    <div>
      <div class="card mb-4">
      <div class="card-header bg-primary text-white">Search Functionality</div>
        <div class="card-body">
          <form @submit.prevent="submitSearch" class="form-inline mb-3">
            <label for="searchBy" class="mr-2">Search Category:</label>
            <select v-model="form.search_type" id="searchBy" class="form-control mr-2">
              <option value="service">Service</option>
              <option value="professional">Professional</option>
              <option value="request">Request</option>
            </select>
            <label for="searchBy" class="mr-2">Search By:</label>
            <input v-model="form.search_text" id="searchText" type="text" class="form-control mr-2" placeholder="Enter search text">
            <button type="submit" class="btn btn-primary">Search</button>
          </form>

          <div v-if="messages.length" class="flash-messages">
            <div v-for="(message, index) in messages" :key="index" :class="'alert alert-' + message.category">
              {{ message.text }}
            </div>
          </div>

          <div v-if="searchResults.length">
            <h3>Search Results:</h3>
            <table class="table table-bordered">
              <thead class="thead-dark">
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in searchResults" :key="result.id">
                  <td>{{ result.id }}</td>
                  <td>{{ result.type }}</td>
                  <td>
                    <!-- Service Details -->
                    <div v-if="result.type === 'service'">
                      <p><strong>Name:</strong> {{ result.name || 'N/A' }}</p>
                      <p><strong>Description:</strong> {{ result.description || 'N/A' }}</p>
                      <p><strong>Base Price:</strong> {{ result.base_price || 'N/A' }}</p>
                      <p><strong>Category:</strong> {{ result.category || 'N/A' }}</p>
                    </div>
                    
                    <!-- Professional Details -->
                    <div v-if="result.type === 'professional'">
                      <p><strong>Name:</strong> {{ result.fullname || 'N/A' }}</p>
                      <p><strong>Category:</strong> {{ result.category || 'N/A' }}</p>
                      <p><strong>Experience:</strong> {{ result.experience || 'N/A' }}</p>
                    </div>

                    <!-- Service Request Details -->
                    <div v-if="result.type === 'request'">
                      <p><strong>Professional Name:</strong> {{ result.professional_name || 'Unknown' }}</p>
                      <p><strong>Service Name:</strong> {{ result.service_name || 'Unknown' }}</p>
                      <p><strong>Status:</strong> {{ result.status || 'Unknown' }}</p>
                      <p><strong>Request Date:</strong> {{ result.request_date || 'N/A' }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        search_type: "service", // Default search type
        search_text: ""
      },
      searchResults: [],
      messages: []
    };
  },
  methods: {
    async submitSearch() {
      this.messages = [];  // Clear previous messages

      if (!this.form.search_type || !this.form.search_text.trim()) {
        this.messages.push({ category: "warning", text: "Please enter search criteria." });
        return;
      }

      try {
        const params = new URLSearchParams({
          searchBy: this.form.search_type,
          searchText: this.form.search_text
        }).toString();

        const res = await fetch(`${location.origin}/customer/search?${params}`, {
          method: 'GET', 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });

        const data = await res.json();

        if (res.ok) {
          this.searchResults = data.results.map(result => ({
            id: result.id,
            type: result.type,
            name: result.name || "",
            description: result.description || "",
            base_price: result.base_price || "",
            category: result.category || "",
            fullname: result.fullname || "",
            experience: result.experience || "",
            status: result.status || "",
            service_name: result.service_name || "Unknown",
            professional_name: result.professional_name || "Unknown",
            request_date: result.request_date || "N/A"
          }));
        } else {
          this.searchResults = [];
          this.messages.push({ category: "danger", text: data.error || "No results found." });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        this.searchResults = [];
        this.messages.push({ category: "danger", text: "An error occurred. Please try again later." });
      }
    }
  }
};
