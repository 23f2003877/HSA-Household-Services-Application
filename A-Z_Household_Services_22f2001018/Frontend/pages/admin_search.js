export default {
  template: `
    <div>
      <div class="card mb-4">
        <div class="card-body">
          <h2>Search Functionality</h2>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in searchResults" :key="result.id">
                  <td>{{ result.id }}</td>
                  <td>{{ result.type }}</td>
                  <td>{{ result.details }}</td>
                  <td>
                    <button v-if="result.type === 'Professional'" @click="manageProfessional(result.id, 'accept')" class="btn btn-success btn-sm">Accept</button>
                    <button v-if="result.type === 'Professional'" @click="manageProfessional(result.id, 'block')" class="btn btn-warning btn-sm">Block</button>
                    <button @click="deleteEntry(result.id)" class="btn btn-danger btn-sm">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else-if="searchCompleted">
            <p class="alert alert-info">No results found.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        search_type: "",
        search_text: ""
      },
      searchResults: [],
      messages: [],
      searchCompleted: false // New flag to indicate search completion
    };
  },
  methods: {
    async submitSearch() {
      this.messages = [];
      this.searchResults = []; // Clear previous results
      this.searchCompleted = false;

      try {
        const res = await fetch(`${location.origin}/admin/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify({
            search_type: this.form.search_type,
            search_text: this.form.search_text
          })
        });

        if (res.ok) {
          const data = await res.json();

          // Ensure we are correctly receiving and processing the data
          if (Array.isArray(data.data)) {
            this.searchResults = data.data.map(item => ({
              id: item.id,
              type: item.type,
              details: item.details
            }));
          }

          this.messages.push({ category: 'success', text: data.message });
        } else {
          const errorData = await res.json();
          this.messages.push({
            category: errorData.category || 'danger',
            text: errorData.message || 'An error occurred during the search.'
          });
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        this.messages.push({
          category: 'danger',
          text: 'An unexpected error occurred. Please try again later.'
        });
      } finally {
        this.searchCompleted = true;
      }
    },
    async manageProfessional(id, action) {
      try {
        await fetch(`${location.origin}/admin/search-manage-professionals/${id}/${action}`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });
        this.submitSearch();
      } catch (error) {
        console.error('Error managing professional:', error);
      }
    },
    async deleteEntry(id) {
      try {
        await fetch(`${location.origin}/admin/delete/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });
        this.submitSearch();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  }
};
