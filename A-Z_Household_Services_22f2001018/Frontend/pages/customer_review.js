export default {
    template: `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">Review Completed Services</div>
            <div class="card-body">
                <h5>Services Completed But Not Rated Yet</h5>
                <table class="table table-striped" v-if="serviceRequests.length">
                    <thead>
                        <tr>
                            <th>Service Name</th>
                            <th>Professional</th>
                            <th>Request Date</th>
                            <th>Rating</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="request in serviceRequests" :key="request.id">
                            <td>{{ request.service_name }}</td>
                            <td>{{ request.professional_name }} ({{ request.professional_email }})</td>
                            <td>{{ request.request_date }}</td>
                            <td>
                                <input type="number" class="form-control" v-model="request.rating" min="1" max="5" placeholder="Rate 1-5">
                            </td>
                            <td>
                                <button class="btn btn-primary" @click="submitRating(request.id, request.rating)">Submit</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-else class="text-muted">No unrated completed services found.</p>
            </div>
        </div>
    `,
    data() {
        return {
            serviceRequests: []
        };
    },
    created() {
        this.fetchServiceRequests();
    },
    methods: {
        async fetchServiceRequests() {
            try {
                const response = await fetch('/customer/get_unrated_services', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch service requests");
                }

                const data = await response.json();
                this.serviceRequests = data.service_requests.map(req => ({ ...req, rating: null }));
            } catch (error) {
                console.error('Error fetching service requests:', error);
                alert("Error loading services. Please try again.");
            }
        },
        async submitRating(serviceRequestId, rating) {
            rating = Number(rating); // Convert rating to a number
        
            if (!rating || rating < 1 || rating > 5) {
                alert("Please select a rating between 1 and 5.");
                return;
            }
        
            try {
                const response = await fetch('/customer/submit_rating', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ serviceRequestId, rating })
                });
        
                const result = await response.json();
                if (response.ok) {
                    alert("Rating submitted successfully!");
                    this.fetchServiceRequests();
                } else {
                    alert(`Failed to submit rating: ${result.message}`);
                }
            } catch (error) {
                console.error("Error submitting rating:", error);
                alert("Error submitting rating. Please try again.");
            }
        }
    }        
};
