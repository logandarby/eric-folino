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

    const script = document.createElement('script');
    script.src = 'https://cdn.sendfox.com/js/form.js';
    script.async = true;
    script.onload = () => {
      // Manually trigger SendFox initialization after script loads
      // This ensures the form exists when SendFox processes it
      setTimeout(() => {
        const forms = document.getElementsByClassName('sendfox-form');
        let recaptchaLoaded = false;

        // Process each form (copied from deobfuscated script)
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
          if (form.dataset.async === 'true') {
            // Remove previous messages
            const existingMessage = form.querySelector('.sendfox-message');
            if (existingMessage) {
              existingMessage.remove();
            }

            // Disable submit button
            const submitButton = form.querySelector(
              'button'
            ) as HTMLButtonElement;
            if (submitButton) {
              submitButton.disabled = true;
            }

            // Create AJAX request
            const xhr = new XMLHttpRequest();

            // Handle response
            xhr.addEventListener('load', function (event) {
              const response = JSON.parse(xhr.responseText);
              const xhr2 = event.currentTarget as XMLHttpRequest;

              if (xhr2?.status === 422) {
                // Validation error
                if (Object.prototype.hasOwnProperty.call(response, 'errors')) {
                  const errorMessage = document.createElement('p');
                  errorMessage.className = 'sendfox-message error';
                  errorMessage.innerHTML = response.errors[0];
                  form.appendChild(errorMessage);
                }
              } else if (xhr2?.status === 200) {
                // Success
                if (response.redirect_url) {
                  window.location.href = response.redirect_url;
                } else {
                  const successMessage = document.createElement('p');
                  successMessage.className = 'sendfox-message success';
                  successMessage.innerHTML =
                    'Thanks, your signup was successful!';
                  form.appendChild(successMessage);
                  form.reset();
                }
              }

              if (submitButton) {
                submitButton.disabled = false;
              }
            });

            // Handle error
            xhr.addEventListener('error', function () {
              console.error('Error submitting form.');
              if (submitButton) {
                submitButton.disabled = false;
              }
            });

            // Send request
            xhr.open('POST', form.action);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.send(new FormData(form));
          } else {
            // Standard form submission
            form.submit();
          }
        };
      }, 100); // Small delay to ensure DOM is ready
    };
    document.body.appendChild(script);
    window.SENDFOX_FORM_LOADED = true;

    // Optional cleanup: remove script on unmount
    return () => {
      document.body.removeChild(script);
    };
  }, []);
};
