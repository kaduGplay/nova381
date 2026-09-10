
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar slider apenas se ainda não foi inicializado
    if (typeof window.TbxTextSliders === 'undefined') {
        window.TbxTextSliders = {};
    }
    
    const sliderId = 'home_informativos_slider';
    
    if (!window.TbxTextSliders[sliderId]) {
        window.TbxTextSliders[sliderId] = {
            init: function() {
                const slider = document.getElementById(sliderId);
                const prevBtn = document.getElementById(sliderId + 'Prev');
                const nextBtn = document.getElementById(sliderId + 'Next');
                const indicators = document.querySelectorAll(`[data-slide]`);
                
                if (!slider) return;

                let currentSlide = 0;
                const slides = slider.querySelectorAll('.text-slide');
                const totalSlides = slides.length;
                
                const updateSlider = () => {
                    const translateX = -currentSlide * 100;
                    slider.style.transform = `translateX(${translateX}%)`;
                    
                    // Atualizar indicadores
                    indicators.forEach((indicator, index) => {
                        indicator.classList.toggle('active', index === currentSlide);
                        //indicator.classList.toggle('bg-white', index === currentSlide);
                        //indicator.classList.toggle('bg-white/50', index !== currentSlide);
                    });
                };

                const nextSlide = () => {
                    currentSlide = (currentSlide + 1) % totalSlides;
                    updateSlider();
                };

                const prevSlide = () => {
                    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
                    updateSlider();
                };

                const goToSlide = (index) => {
                    currentSlide = index;
                    updateSlider();
                };

                // Event listeners
                if (nextBtn) nextBtn.addEventListener('click', nextSlide);
                if (prevBtn) prevBtn.addEventListener('click', prevSlide);

                indicators.forEach((indicator) => {
                    indicator.addEventListener('click', () => {
                        const slideIndex = parseInt(indicator.dataset.slide);
                        goToSlide(slideIndex);
                    });
                });

                // Auto-play
                let autoPlayInterval;
                const startAutoPlay = () => {
                    if (slider.dataset.autoplay === 'true') {
                        const delay = parseInt(slider.dataset.autoplayDelay) || 4000;
                        autoPlayInterval = setInterval(nextSlide, delay);
                    }
                };

                const stopAutoPlay = () => {
                    clearInterval(autoPlayInterval);
                };

                startAutoPlay();

                // Pausar no hover
                slider.closest('.text-slider-container').addEventListener('mouseenter', stopAutoPlay);
                slider.closest('.text-slider-container').addEventListener('mouseleave', startAutoPlay);

                // Pausar quando clicar em um link
                const slideLinks = slider.querySelectorAll('a');
                slideLinks.forEach(link => {
                    link.addEventListener('click', stopAutoPlay);
                });

                // Expor API
                window.TbxTextSliders[sliderId].api = {
                    next: nextSlide,
                    prev: prevSlide,
                    goToSlide: goToSlide,
                    currentSlide: () => currentSlide,
                    startAutoPlay: startAutoPlay,
                    stopAutoPlay: stopAutoPlay
                };
            }
        };
        
        // Inicializar o slider
        window.TbxTextSliders[sliderId].init();
    }
});
