export default {
  template: `
    <div class="card mb-4">
      <div class="card-body">
        <h2>Summary</h2>
        <p>This section contains the summary of all the activities performed on the admin dashboard.</p>

        <div class="mb-4">
          <h4>Services Completed by Name</h4>
          <table class="table table-bordered">
            <thead class="thead-dark">
              <tr>
                <th>Service Name</th>
                <th>Completed Requests</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in servicesByName" :key="service.name">
                <td>{{ service.name }}</td>
                <td>{{ service.completed_request_count || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mb-4">
          <h4>Service Available by Category</h4>
          <table class="table table-bordered">
            <thead class="thead-dark">
              <tr>
                <th>Category</th>
                <th>Requests</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in servicesByCategory" :key="service.category">
                <td>{{ service.category }}</td>
                <td>{{ service.category_count || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mb-4">
          <h4>Top-Rated Professionals</h4>
          <table class="table table-bordered">
            <thead class="thead-dark">
              <tr>
                <th>Professional Name</th>
                <th>Average Rating</th>
                <th>Rating Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="professional in professionalsWithRatings" :key="professional.fullname">
                <td>{{ professional.fullname }}</td>
                <td>{{ professional.avg_rating ? professional.avg_rating.toFixed(2) : '0.00' }}</td>
                <td>{{ professional.rating_percentage ? professional.rating_percentage.toFixed(2) + '%' : '0.00%' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      servicesByName: [],
      servicesByCategory: [],
      professionalsWithRatings: []
    };
  },
  methods: {
    async fetchSummaryData() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${location.origin}/admin/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        this.servicesByName = data.services_by_name;
        this.servicesByCategory = data.services_by_category;
        this.professionalsWithRatings = data.professionals_with_ratings;
      } catch (error) {
        console.error('Error fetching summary data:', error);
      }
    }
  },
  mounted() {
    this.fetchSummaryData();
  }
};