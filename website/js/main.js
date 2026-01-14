// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const programCards = document.querySelectorAll('.program-card');
    const programsSections = document.querySelectorAll('.programs-section');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filter programs
            if (filter === 'all') {
                programCards.forEach(card => {
                    card.style.display = 'flex';
                });
                programsSections.forEach(section => {
                    section.style.display = 'block';
                });
            } else {
                // Hide all sections first
                programsSections.forEach(section => {
                    section.style.display = 'none';
                });

                // Show only matching cards
                programCards.forEach(card => {
                    if (card.getAttribute('data-status') === filter) {
                        card.style.display = 'flex';
                        // Show the parent section
                        card.closest('.programs-section').style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
