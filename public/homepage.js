// Presence of "document" signifies that this JS file is meant for browser to execute.
// As such, do NOT utilize NodeJS to execute this file (you can try, but it doesn't work)
// This file injects the JavaScript code required for the homepage (index.ejs) file.
// Remember that 'ejs' files are NOT JavaScript files, but HTML files with added functionality.

let COLOR_NO_SEL_FILE = 'rgb(0, 140, 233)';
let COLOR_FILE_CURR_SEL = 'rgb(2, 181, 6)';
let DEFAULT_FAIL_IMAGE = "images/cross.jpg";
let DEFAULT_SUCCESS_IMAGE = "images/checkmark.png";
let TRUNCATE_CONTENT_CHARS = 265;

var adminMode = verifyAdminStatus();
document.addEventListener("DOMContentLoaded", () => {
    // Start rendering posts
    renderPosts();

    document.querySelector('#image-upload-button').addEventListener('click', () => document.querySelector('#fileInput').click());

    // Handle Admin display first
    // We change the admin button to reflect the name.
    let navbarHeight = document.querySelector('.navbar').offsetHeight;
    if(adminMode) {
        let adminButton = document.getElementById('admin-button');
        let logoutButton = document.getElementById('logout-button');
        let createPostActionButton = document.getElementById('action-create-post');
        let deleteAllPostsActionButton = document.getElementById("action-delete-all-posts");
        adminButton.onclick = "window.location.href = '#'"
        adminButton.innerText = "Logged In: Administrator";
        logoutButton.removeAttribute('hidden');
        createPostActionButton.removeAttribute('hidden');
        deleteAllPostsActionButton.removeAttribute('hidden');

        // Dynamically adjust the margin of create post and delete all posts buttons
        createPostActionButton.style.marginTop = `${navbarHeight + 15}px`;
        deleteAllPostsActionButton.style.marginTop = `${navbarHeight + 15}px`;

        createPostActionButton.addEventListener('click', () => setupPostModalMode('create'));
        
        deleteAllPostsActionButton.addEventListener('click', () => {
            // Populate text by returning data from the /cards/all endpoint
            fetch('/cards/all', {
                method: 'GET',
                headers: {
                    'X-CSJS-RunOwner': 'true'
                }
            })
            .then(async resp => {
                if(resp.ok) {
                    data = await resp.json();
                    if(data.length === 0) {
                        // If there is nothing to delete, alter the text element and the cancel button. Also, hide the delete button.
                        deleteAllPostsTextElement.textContent = "There are no posts for you to delete.";
                        deleteAllPostsCancelButton.textContent = "Okay";
                        deleteAllPostsCancelButton.className = "btn btn-primary";
                        deleteAllPostsButton.setAttribute('hidden', 'true');
                        return;
                    }
                    deleteAllPostsTextElement.textContent = `Are you sure you want to delete all ${data.length} posts?`;
                } else
                    deleteAllPostsTextElement.textContent = "Are you sure you want to delete all posts?";
            });
        });
    } else {
        let placeholderMargin = document.getElementById('placeholder-margin-creator');
        placeholderMargin.style.marginBottom = `${navbarHeight + 30}px`;
    }
    // If the database is not ready, notify the user.
    fetch('/status', {
        method: 'GET',
        headers: {
            'X-CSJS-RunOwner': 'True'
        } 
    }).then(response => {
        if(!response.ok)
            alert("The posts cannot be obtained currently as the database is not available. You may want to try again later.");
    });

    // Modal: If fileInput received the image, JS should change the file name shown.
    // Modal: When the user enters something into the Post Title field, update the remaining characters left.
    setupPostModalMode('create');

    // Delete All Posts Modal
    let deleteAllPostsTextElement = document.getElementById("delete-all-posts-text");
    let deleteAllPostsCancelButton = document.getElementById("delete-all-posts-cancel");
    let deleteAllPostsButton = document.getElementById("delete-all-posts-button");
    let deleteAllPostsModal = document.getElementById("deleteAllPostsModal");
    
    deleteAllPostsButton.addEventListener("click", () => {
        fetch('/cards/all', {
            method: 'DELETE',
            headers: {
                'X-CSJS-RunOwner': 'true'
            }
        })
        .then(async resp => {
            let modal = bootstrap.Modal.getInstance(deleteAllPostsModal);
            let data = await resp.json();
            if(modal)
                modal.hide();
            if(resp.ok) {
        
                showToast("Posts Deleted", `${data.count} posts have been deleted.`, null);
                renderPosts(true);
            } else {
                showToast("Failed to Delete Posts", "An internal error occurred while trying to deleting all posts", DEFAULT_FAIL_IMAGE);
            }
        });
    });

    // Event Delegation Code: Trigger Read More for the corresponding post ID
    document.addEventListener('click', event => {
        if(!event.target || !event.target.classList.contains('post-info-expand')) {
            // If class list doesn't contain the read more class, ignore.
            return;
        }
        let postId = event.target.getAttribute("expand-info-id");
        showPostInfoModal(postId);
        return;
    });
});

// Initialize internal functions for building Bootstrap cards
// The silent = false defaults the silent variable to false. However, it can create a silent refresh effect simply by setting silent to true, which suppresses alert().
function renderPosts(silent = false) {
    fetch('/cards/all', {
        'method': 'GET',
        'headers': {
            'X-CSJS-RunOwner': 'true'
        }
    })
    .then(async response => {
        let data = await response.json();
        if('error' in data) {
            console.error("Received an error from endpoint `/cards/all`\n", data.error);
            return false;
        }
        let primaryCardRow = document.getElementById('primary-card-row');
        primaryCardRow.innerHTML = "";
        if(data.length === 0) {
            if(!silent)
                alert("There are no posts to display.");
            return true;
        }
        data.forEach(entry => {
            let id = entry.id;
            let title = entry.title;
            let content = entry.postContent;
            let src = null;
            if(entry.postImage) {
                // Why Uint8Array (and not Uint16Array/Uint32Array): Each byte is 8 bits. Since we're processing bytes (binary), using Uint8Array will ensure that the files
                // are correctly processed and displayed based on 8 bits = 1 byte. 
                src = generateBlob(entry.postImage);
            }
            addPost(title, content, id, src);
        }); 
        return true;
    })
}

// If `toastImage` is null, it will show a checkmark.
function showToast(toastTitle, toastContent, toastImage) {
    let titleElement = document.getElementById("toast-title");
    let imageElement = document.getElementById("toast-image");
    imageElement.src = toastImage || DEFAULT_SUCCESS_IMAGE;
    titleElement.innerText = toastTitle;
    
    let toastElement = document.querySelector('.toast');
    let toast = new bootstrap.Toast(toastElement);
    toastElement.querySelector('.toast-body').textContent = toastContent;
    toast.show();
}

// postImage will simply throw the value directly into source with NO formatting.
// Do ensure that the binary data is in the correct format (base64) before forwarding to this method.
function addPost(postTitle, postContent, postId, postImage) {
    var primaryCardRow = document.getElementById('primary-card-row');

    let colDiv = document.createElement('div');
    colDiv.classList.add('col');

    let cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.id = `${postId}`;
    colDiv.appendChild(cardDiv);

    let img = document.createElement('img');
    img.classList.add('card-img-top');
    img.alt = 'Post Image';
    if(postImage !== null)
        img.src = postImage;
    else
        img.src = "/images/no_image.png";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "350px"; 
    cardDiv.appendChild(img);

    let cardBodyDiv = document.createElement('div');
    cardBodyDiv.classList.add('card-body');
    cardDiv.appendChild(cardBodyDiv);

    let cardTitleElement = document.createElement('h5');
    cardTitleElement.classList.add('card-title');
    cardTitleElement.textContent = postTitle;
    cardBodyDiv.append(cardTitleElement);

    let cardContentElement = document.createElement('p');
    cardContentElement.classList.add('card-text');
    
    if(postContent.length <= TRUNCATE_CONTENT_CHARS)
        // No need to truncate anything
        cardContentElement.textContent = postContent;
    else
        // Truncate at set point
        cardContentElement.textContent = postContent.substring(0, TRUNCATE_CONTENT_CHARS) + "...";
    cardBodyDiv.append(cardContentElement);

    let cardButtonElement = document.createElement('button');
    // The 'post-info-expand' class here does nothing in CSS. It's used for event delegation later in the code.
    cardButtonElement.className = "btn btn-primary post-info-expand";
    if(postContent.length <= TRUNCATE_CONTENT_CHARS)
        cardButtonElement.textContent = "Expand Full Post";
    else
        cardButtonElement.textContent = "Read More";
    cardButtonElement.setAttribute('expand-info-id', postId);
    cardBodyDiv.append(cardButtonElement);

    primaryCardRow.appendChild(colDiv);
}

// Display the post info modal by directly querying server for data and spitting it out.
function showPostInfoModal(postId) {
    let modalElement = document.getElementById('postInfoModal');
    let postInfoBSModal = new bootstrap.Modal(modalElement);
    let postInfoModalTitle = document.getElementById("postInfoModalTitle");
    let postInfoModalContent = document.getElementById("postInfoModalContent");
    let postInfoModalImage = document.getElementById('postInfoModalImage');
    let postInfoModalDeleteButton = document.getElementById('postInfoModalDeleteButton');
    let postInfoModalUpdateButton = document.getElementById('postInfoModalUpdateButton');

    if(adminMode) {
        postInfoModalDeleteButton.removeAttribute('hidden');
        postInfoModalUpdateButton.removeAttribute('hidden');
    }

    // Prepare Modal
    postInfoModalDeleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        fetch(`/cards/${postId}`, {
            method: 'DELETE',
            headers: {
                'X-CSJS-RunOwner': 'true'
            }
        })
        .then(async resp => {
            postInfoBSModal.hide();
            if(resp.ok) {
                showToast("Post Deleted", `Post '${postInfoModalTitle.textContent}' (ID ${postId}) has been deleted.`, null);
                renderPosts(true);
                return;   
            }
            let data = await resp.json();
            console.error(data.error);
            showToast("Failed to Delete Post", `Post '${postInfoModalTitle.textContent}' (ID ${postId}) could not be deleted. An error has been logged in the console.`, DEFAULT_FAIL_IMAGE);
        });
    });

    postInfoModalUpdateButton.addEventListener('click', () => {
        let postModalElement = document.getElementById("createPostModal");
        let postModal = new bootstrap.Modal(postModalElement);
        setupPostModalMode('update', postId);
        postInfoBSModal.hide();
        setTimeout(() => postModal.show(), 800); // Prevent overlap of modal
    });


    fetch(`/cards/${postId}`, {
        method: 'GET',
        headers: {
            'X-CSJS-RunOwner': 'true'
        }
    })
    .then(async resp => {
        if(resp.status === 404) {
            showToast("Error", `Could not expand this post: Post with ID ${postId} not found.`, DEFAULT_FAIL_IMAGE);
            return;
        }
        if(!resp.ok) {
            showToast("Error", `An internal error has been logged to the console.`, DEFAULT_FAIL_IMAGE);
            return;
        }
        data = await resp.json();
        postInfoModalTitle.textContent = data.title || "Title not found";
        postInfoModalContent.textContent = data.postContent || "Content not found";
        if(data.postImage) {
            postInfoModalImage.src = generateBlob(data.postImage);
        } else {
            postInfoModalImage.setAttribute('hidden', 'true');
        }
        postInfoBSModal.show();
    });
}

// Creates a blob object out of the data returned by the MySQL database.
function generateBlob(postImage, mimetype = 'image/jpeg') {
    let binaryData = new Uint8Array(postImage.data);
    let blob = new Blob([binaryData], { type: mimetype });
    return URL.createObjectURL(blob);
}

// Change around create post modal and display
// `id` only for update
// Automatically fill in the old data into the fields if its update.
function setupPostModalMode(forAction, id) {
    let createPostForm = document.getElementById('create-post-form');
    let createPostModal = document.getElementById('createPostModal');
    let uploadImageButton = document.getElementById("image-upload-button");
    let uploadImageButtonText = document.querySelector('#image-upload-button p');
    let imagePreview = document.getElementById('image-upload-preview');
    let fileInput = document.getElementById('fileInput');
    let deleteUploadButton = document.getElementById('image-upload-cancel');
    let createPostButton = document.getElementById('create-post-button');
    let createPostTitleUserInputField = document.getElementById('post-title-user-input');
    let createPostTitleCharCount = document.getElementById('create-post-title-char-count');
    let createPostContentField = document.getElementById('postcontent');
    let createPostModalErrorDisplay = document.getElementById('modal-error-display');
    let postModalHeader = document.getElementById('createPostModalTitle');
    const allowedFileExtensions = ['.bmp', '.gif', '.jpeg', '.jpg', '.png', '.tiff', '.tif', '.webp','.svg', '.ico'];
    createPostTitleUserInputField.oninput = () => {
        let remainingChars = 32 - createPostTitleUserInputField.value.length;
        createPostTitleCharCount.textContent = remainingChars;
        if(remainingChars < 10)
            createPostTitleCharCount.style.color = 'red';
        else
            createPostTitleCharCount.style.color = 'gray';
    };
    deleteUploadButton.onclick = (event) => {
        event.stopPropagation();    
        clearImageUploadFields();
    };
    const maxFileSize = 16 * 1024 * 1024 // 16 MB in bytes
    
    fileInput.onchange = () => {
        if(fileInput.files[0].size > maxFileSize) {
            alert("There is a 16 MB size limit on the image you can provide.");
            deleteUploadButton.click();
            return;
        }
        if(allowedFileExtensions.every(ext => !fileInput.files[0].name.endsWith(ext))) {
            alert(`Unsupported file extension! Supported extensions are: ${allowedFileExtensions.join(', ')}`);
            deleteUploadButton.click();
            return;
        }
        if(fileInput.files.length > 0) {
            uploadImageButtonText.textContent = `Image: ${fileInput.files[0].name}`; 
            uploadImageButton.style.color = COLOR_FILE_CURR_SEL;
            uploadImageButton.style.width = "auto";
            uploadImageButton.style.height = "auto";
            uploadImageButton.style.border = `1.5px solid ${COLOR_FILE_CURR_SEL}`;
            imagePreview.removeAttribute('hidden');
            deleteUploadButton.removeAttribute('hidden');
            imagePreview.style.width = 'auto';
            imagePreview.style.height = `${uploadImageButton.clientHeight - 15}px`;
            imagePreview.src = URL.createObjectURL(fileInput.files[0]); 
        } else {
            clearImageUploadFields();
            imagePreview.src = '';
        }
    };
    createPostButton.setAttribute('mode', forAction);
    if(forAction === 'create') {
        postModalHeader.innerText = "Create Post";
        createPostButton.innerText = "Create Post";
        createPostTitleUserInputField.setAttribute('required', 'true');
        createPostContentField.setAttribute('required', 'true');
    } else {
        postModalHeader.innerText = "Update Post";
        createPostButton.innerText = "Update Post";
        createPostTitleUserInputField.removeAttribute('required');
        createPostContentField.removeAttribute('required');
    }

    // Modal: Create Post functionality (verify validity, upload to database)
    // Replace the onclick directly to prevent event listeners from stacking.
    createPostButton.onclick = (event) => {
        if(createPostButton.getAttribute('mode') === 'create')
            setupPostModalMode('create');
        else
            setupPostModalMode('update');
        if(!createPostForm.checkValidity()) { // checkValidity here only checks for missing values.
            createPostForm.reportValidity();
            return;
        }
        let formData = new FormData();
        if(forAction === 'create') {
            formData.append('title', createPostTitleUserInputField.value);
            formData.append('content', createPostContentField.value);
            formData.append('image_data', fileInput.files[0]);
        } else {
            let newTitle = createPostTitleUserInputField.value;
            let newContent = createPostContentField.value;
            let newImage = fileInput.files[0];
            if(newTitle)
                formData.append('title', newTitle);
            if(newContent)
                formData.append('content', newContent);
            if(newImage)
                formData.append('image_data', newImage);

        }
    
        // Send to endpoint
        let endpoint = '/cards';
        if(forAction === 'update') {
            endpoint = `/cards/update/${id}`;
        }
        fetch(endpoint, {
            'method': 'POST',
            'headers': {
               'X-CSJS-RunOwner': 'true'
            },
            body: formData,
            credentials: 'include'
        })
        .then(async response => {
            let data = await response.json();
            if('id' in data) {
                // Create Post success
                // Dismiss modal
                let modal = bootstrap.Modal.getInstance(createPostModal);
                createPostForm.reset(); 
                   
                // Perform another clearing of image upload fields
                clearImageUploadFields();
                if(modal)
                    modal.hide();
                showToast("Created Post", "Your post has been created.", null);
                renderPosts();
            } else if('update' in data)  {
                let modal = bootstrap.Modal.getInstance(createPostModal);
                createPostForm.reset();
                   
                // Perform another clearing of image upload fields
                clearImageUploadFields();
                if(modal)
                    modal.hide();
                showToast("Updated Post", `Your post with ID ${id} has been updated.`, null);
                renderPosts();
            } else {
                // Create Post failed. Display error
                createPostModalErrorDisplay.textContent = `Action failed: ${data.error}`;
                createPostModalErrorDisplay.removeAttribute('hidden');
            }
        })
    };

    // hidden.bs.modal refers to the event. In this case, it differs from your 'click' and 'input' because hidden.bs.modal refers to a Bootstrap event (modal hidden event).
    createPostModal.addEventListener('hidden.bs.modal', function() {
        clearImageUploadFields();
        createPostTitleUserInputField.value = "";
        createPostContentField.value = "";
        // Force the removal of all modal backdrops upon hiding of modal. This should prevent a third firing of the create post modal from blocking screen.
        // THIS IS A WORKAROUND FOR A BUG I OBSERVED.
        setTimeout(() => {
            let backdrop = document.getElementsByClassName("modal-backdrop")[0];
            backdrop.parentNode.removeChild(backdrop);
            document.body.style = ""; // Reset to allow scrolling
        }, 1200);
    });

    // Workaround for bug
    createPostModal.addEventListener('shown.bs.modal', function() {
        setTimeout(() => {
            deleteExcessBackdrops();
        }, 1200);
    });
}

// Bug Workaround
function deleteExcessBackdrops() {
    let backdrops = document.getElementsByClassName('modal-backdrop');
    if(backdrops.length > 1) {
        for(let i = 1; i < backdrops.length; i++)
            backdrops[i].parentNode.removeChild(backdrops[i]);
    }
}

function clearImageUploadFields() {
    let uploadImageButton = document.getElementById("image-upload-button");
    let uploadImageButtonText = document.querySelector('#image-upload-button p');
    let imagePreview = document.getElementById('image-upload-preview');
    let fileInput = document.getElementById('fileInput');
    let deleteUploadButton = document.getElementById('image-upload-cancel');
    uploadImageButtonText.textContent = "Upload Image";
    uploadImageButton.style.color = COLOR_NO_SEL_FILE;
    uploadImageButton.style.width = "125px";
    uploadImageButton.style.height = "35px"
    uploadImageButton.style.border = `1.5px solid ${COLOR_NO_SEL_FILE}`;
    imagePreview.setAttribute('hidden', 'true');
    deleteUploadButton.setAttribute('hidden', 'true');
    imagePreview.src = '';
    fileInput.value = '';
}