import { useEffect } from 'react';

// Extend the window type to include SENDFOX_FORM_LOADED and grecaptcha
declare global {
  interface Window {
    SENDFOX_FORM_LOADED?: boolean;
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

export const useSendFox = () => {
  useEffect(() => {
    // Only load once
    if (window.SENDFOX_FORM_LOADED) return;

    // Set flag BEFORE loading script to prevent original script from initializing
    window.SENDFOX_FORM_LOADED = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.sendfox.com/js/form.js';
    script.async = true;
    script.onload = () => {
      // Manually trigger SendFox initialization after script loads
      // This ensures the form exists when SendFox processes it
      setTimeout(() => {
        const forms = document.getElementsByClassName('sendfox-form');
        let recaptchaLoaded = false;

        // Process each form (copied from form.js)
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i] as HTMLFormElement;

          // Load reCAPTCHA if needed
          if (form.dataset.recaptcha === 'true' && !recaptchaLoaded) {
            const recaptchaScript = document.createElement('script');
            recaptchaScript.type = 'text/javascript';
            recaptchaScript.src =
              'https://www.google.com/recaptcha/api.js?render=6Lemwu0UAAAAAJghn3RQZjwkYxnCTuYDCAcrJJ7S';

            const firstScript = document.getElementsByTagName('script')[0];
            if (firstScript?.parentNode) {
              firstScript.parentNode.insertBefore(recaptchaScript, firstScript);
            }
            recaptchaLoaded = true;
          }

          // Setup form submission with reCAPTCHA
          form.addEventListener('submit', function (event) {
            event.preventDefault();
            const currentForm = event.currentTarget as HTMLFormElement;

            if (currentForm.dataset.recaptcha === 'true') {
              // Handle reCAPTCHA verification
              window.grecaptcha?.ready(function () {
                window.grecaptcha
                  ?.execute('6Lemwu0UAAAAAJghn3RQZjwkYxnCTuYDCAcrJJ7S', {
                    action: 'embedded_form',
                  })
                  .then(function (token: string) {
                    // Add reCAPTCHA token to form
                    const recaptchaInput = document.createElement('input');
                    recaptchaInput.setAttribute('name', 'g-recaptcha-response');
                    recaptchaInput.setAttribute('value', token);
                    recaptchaInput.setAttribute('type', 'hidden');
                    currentForm.appendChild(recaptchaInput);

                    submitForm(currentForm);
                  })
                  .catch(function (error: Error) {
                    console.error('Recaptcha failed:', error);
                    submitForm(currentForm);
                  });
              });
            } else {
              submitForm(currentForm);
            }
          });
        }

        // Form submission handler
        const submitForm = function (form: HTMLFormElement) {
          // Disable submit button while loading
          const submitButton = form.querySelector(
            'button'
          ) as HTMLButtonElement;
          if (submitButton) {
            submitButton.disabled = true;
          }

          // Standard form submission (page will redirect)
          form.submit();
        };
      }, 100); // Small delay to ensure DOM is ready
    };
    document.body.appendChild(script);

    // Optional cleanup: remove script on unmount
    return () => {
      document.body.removeChild(script);
    };
  }, []);
};
