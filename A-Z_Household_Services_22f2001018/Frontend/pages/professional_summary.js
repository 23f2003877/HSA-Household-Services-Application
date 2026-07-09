export default {
  template: `
    <section id="summary" class="container mt-4">
      <h2 class="text-primary text-center">Summary</h2>
      <div class="row">
        <div class="col-md-6 mb-3">
          <div class="card p-3">
            <strong>Reviews and Ratings</strong><br>
            Positive: {{ reviewsRatings.positive }} | Neutral: {{ reviewsRatings.neutral }} | Negative: {{ reviewsRatings.negative }}
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <div class="card p-3">
            <strong>Service Requests</strong><br>
            Total: {{ serviceRequests.total }} | Completed: {{ serviceRequests.completed }} | Accepted: {{ serviceRequests.accepted }} | Pending: {{ serviceRequests.pending }}
          </div>
        </div>
      </div>
    </section>
  `,
  data() {
    return {
      reviewsRatings: { positive: 0, neutral: 0, negative: 0 },
      serviceRequests: { total: 0, completed: 0, accepted: 0, pending: 0 }
    };
  },
  methods: {
    async fetchData() {
      try {
        const response = await fetch(`${location.origin}/professional/summary`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          console.error('Error fetching summary:', response.statusText);
          return;
        }

        const data = await response.json();
        this.reviewsRatings = data.reviews_ratings || { positive: 0, neutral: 0, negative: 0 };
        this.serviceRequests = data.service_requests || { total: 0, completed: 0, accepted: 0, pending: 0 };
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  },
  mounted() {
    this.fetchData();
  }
};
