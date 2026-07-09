export default {
    template: `
        <div>
            <div class="row">
                <div class="col-md-12">
                    <h3>Export Service Requests</h3>
                    <div class="d-flex justify-content-end">
                        <button @click="triggerExport" :disabled="isProcessing || !professionalId" class="btn btn-outline-success">
                            {{ isProcessing ? 'Processing...' : 'Export Service Requests' }}
                        </button>
                    </div>
                    
                    <label for="professionalId">Enter Professional ID:</label>
                    <input type="number" id="professionalId" v-model="professionalId" placeholder="Enter Professional ID" required :disabled="isProcessing" class="form-control"/>
                    
                    <h3>Available Downloads</h3>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(file, index) in downloads" :key="index">
                                <td>{{ file }}</td>
                                <td>
                                    <button @click="downloadFile(file)" class="btn btn-primary">Download</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            isProcessing: false,
            downloads: [],
            professionalId: '',
            timer: null,
        };
    },
    methods: {
        async triggerExport() {
            if (!this.professionalId) {
                alert('Please enter a valid professional ID!');
                return;
            }
            
            this.isProcessing = true;
            
            try {
                const response = await fetch(`/admin/export/${this.professionalId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    },
                });
                if(response.ok){
                    alert('Export triggered successfully!');
                }
            } catch (error) {
                console.error('Error triggering export:', error);
                alert('Failed to trigger the export. Please try again.');
            } finally {
                this.isProcessing = false;
            }
        },
        async fetchDownloads() {
            try {
                const response = await fetch('/admin/reports/list',{
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                if(response.ok){
                    const data = await response.json();
                    this.downloads = data.downloads;
                }
            } catch (error) {
                console.error('Error fetching downloads:', error);
            }
        },
        async downloadFile(filename) {
            try {
                const response = await fetch(`/admin/reports/download/${filename}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                });
                if (!response.ok) {
                    alert("Error downloading file.");
                    return;
                }
                const blob = await response.blob();
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                link.click();    
                window.URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error("Error downloading file:", error);
                alert("An error occurred while downloading the file.");
            }
        },
    },
    mounted() {
        this.fetchDownloads();
        this.timer = setInterval(() => {
            this.fetchDownloads();
        }, 5000);
    },
    beforeDestroy() {
        clearInterval(this.timer);
    }
};