"""
Direct test of transformers import and model loading
"""
print("=" * 70)
print("TRANSFORMERS IMPORT TEST")
print("=" * 70)

print("\n1. Testing imports...")
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    print("✅ Imports successful!")
    print(f"   - transformers version: {__import__('transformers').__version__}")
    print(f"   - torch version: {torch.__version__}")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n2. Testing tokenizer loading...")
try:
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
    print("✅ Tokenizer loaded successfully!")
except Exception as e:
    print(f"❌ Tokenizer failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n3. Testing model loading...")
try:
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/DialoGPT-small",
        pad_token_id=tokenizer.eos_token_id
    )
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Model failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n4. Testing inference...")
try:
    # Test message
    test_message = "Hello, how are you?"
    print(f"   Input: {test_message}")
    
    # Encode
    input_ids = tokenizer.encode(test_message + tokenizer.eos_token, return_tensors='pt')
    
    # Generate
    output = model.generate(
        input_ids,
        max_length=1000,
        pad_token_id=tokenizer.eos_token_id,
        do_sample=True,
        top_k=100,
        top_p=0.7,
        temperature=0.8
    )
    
    # Decode
    response = tokenizer.decode(output[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
    print(f"   Output: {response}")
    print("✅ Inference successful!")
except Exception as e:
    print(f"❌ Inference failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n" + "=" * 70)
print("✅ ALL TESTS PASSED!")
print("=" * 70)
print("\nThe transformers library is working correctly.")
print("The issue may be with gevent or async/threading in the backend.")
