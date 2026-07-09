export default {
  template: `
    <div>
      <div class="card mb-4">
        <div class="card-body">
          <h2 class="text-primary" >Search Service Requests</h2>
          <form @submit.prevent="submitSearch" class="form-inline mb-3">
            <input 
              v-model="form.search_text" 
              id="searchText" 
              type="text" 
              class="form-control mr-2" 
              placeholder="Enter search text" 
              required
            />
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
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(result, index) in searchResults" :key="index">
                  <td>{{ result.id }}</td>
                  <td>{{ result.customer.name }}</td>
                  <td>{{ result.customer.email }}</td>
                  <td>{{ result.customer.address }}</td>
                  <td>{{ result.service.name }}</td>
                  <td>{{ result.service.category }}</td>
                  <td>{{ result.request_date }}</td>
                  <td>{{ result.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="searchCompleted && !searchResults.length" class="alert alert-warning">
            No results found.
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        search_text: ""
      },
      searchResults: [],
      messages: [],
      searchCompleted: false
    };
  },
  methods: {
    async submitSearch() {
      this.messages = [];
      this.searchCompleted = false;
      try {
        const params = new URLSearchParams({
          searchText: this.form.search_text
        }).toString();

        const res = await fetch(`${location.origin}/professional/search?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        const data = await res.json();
        this.searchCompleted = true;

        if (res.ok) {
          this.searchResults = data.service_requests || [];
          if (data.message) {
            this.messages.push({ category: "info", text: data.message });
          }
        } else {
          this.searchResults = [];
          this.messages.push({
            category: "danger",
            text: data.error || "No results found."
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        this.searchResults = [];
        this.messages.push({
          category: "danger",
          text: "An unexpected error occurred. Please try again later."
        });
      }
    }
  }
};
